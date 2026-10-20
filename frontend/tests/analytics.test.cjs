const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../worker/analytics.mjs');

test('24-hour SQL uses timestamp conversion, group/site isolation and excludes tests', () => {
  const { buildQueries } = require('../scripts/analytics-sql.cjs');
  const end = new Date('2026-10-20T00:00:00+07:00');
  const result=buildQueries('default.quiz_events',end);
  assert.equal(result.to-result.from,86400000);
  assert.match(result.sql,/to_timestamp_millis/);assert.match(result.sql,/id = '01'/);
  assert.match(result.sql,/json_get_bool\(meta, 'is_test'\) = false/);
  assert.match(result.sql,/COUNT\(DISTINCT json_get_str\(meta, 'visitor_id'\)\)/);
  assert.throws(()=>buildQueries('x.y; DROP TABLE x.y'),/Table/);
  assert.throws(()=>buildQueries('default.quiz_events',end,"01' OR 1=1"),/Invalid group/);
});

test('classifies device families without calling unknown clients PCs', async () => {
  const { detectDevice } = await load();
  for (const [ua, expected] of [['Mozilla iPhone','ios'],['iPad','ios'],['Android Linux','android'],['Windows NT 10','pc'],['Macintosh','pc'],['X11 Linux','pc'],['','unknown']])
    assert.equal(detectDevice(ua), expected);
});
test('records only successful HTML document GET requests, not API/assets/errors', async () => {
  const { isPageView } = await load();
  const req = new Request('https://example.test/', { headers: { accept: 'text/html' } });
  const html = () => new Response('html', { headers: { 'content-type': 'text/html; charset=utf-8' } });
  assert.equal(isPageView(req, html()), true);
  assert.equal(isPageView(new Request(req,{method:'HEAD'}), html()), false);
  assert.equal(isPageView(new Request(req,{method:'POST'}), html()), false);
  assert.equal(isPageView(req, new Response('{}',{headers:{'content-type':'application/json'}})), false);
  assert.equal(isPageView(req, new Response('error',{status:500,headers:{'content-type':'text/html'}})), false);
  assert.equal(isPageView(new Request('https://example.test/app.js'), html()), false);
});
test('matches teacher schema: group 01, milliseconds, unique event in meta and no raw IP/query', async () => {
  const { createEvent } = await load();
  const req = new Request('https://example.test/?token=private', { headers: { 'cf-connecting-ip':'192.0.2.10','cf-ipcountry':'US','user-agent':'iPhone' } });
  Object.defineProperty(req,'cf',{value:{country:'VN'}});
  const event = createEvent(req, {now:1700000000123});
  assert.equal(event.time,1700000000123);assert.equal(event.id,'01');assert.equal(event.country,'VN');assert.equal(event.ip,null);
  assert.equal(event.meta.path,'/');assert.equal(event.meta.site,'example.test');assert.equal(event.meta.is_test,false);assert.equal(event.device,'ios');
  assert.notEqual(createEvent(req).meta.event_id, createEvent(req).meta.event_id);
  assert.equal(createEvent(new Request('https://example.test/')).country,null);
  assert.equal(JSON.stringify(event).includes('private'),false);
});
test('POST sends a JSON array; non-success and invalid destinations are not ignored', async () => {
  const { sendEvent } = await load();
  const env = { ANALYTICS_INGEST_URL:'https://test-stream.ingest.cloudflare.com' };
  await sendEvent({id:'test'},env,async function (url, init) {
    assert.equal(this,globalThis);
    assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body),[{id:'test'}]);
    assert.equal(init.redirect,'manual');return new Response(null,{status:204});
  });
  await assert.rejects(()=>sendEvent({},env,async()=>new Response(null,{status:400})),/HTTP 400/);
  await assert.rejects(()=>sendEvent({},env,async()=>new Response(null,{status:302,headers:{location:'https://other.test'}})),/HTTP 302/);
  await assert.rejects(()=>sendEvent({},{ANALYTICS_INGEST_URL:'https://example.test'},async()=>{throw Error('Must not send');}),/Invalid analytics/);
});
test('analytics disabled by default; failed delivery never replaces the website response', async (t) => {
  const warning=t.mock.method(console,'warn',()=>{});
  const worker = (await load()).default;
  const req = new Request('https://example.test/',{headers:{accept:'text/html'}});
  const response = new Response('Quiz',{headers:{'content-type':'text/html'}});
  const jobs=[];
  const env={ASSETS:{fetch:async()=>response},ANALYTICS_INGEST_URL:'https://invalid.test'};
  const ctx={waitUntil:promise=>jobs.push(promise)};
  assert.equal(await worker.fetch(req,env,ctx),response);assert.equal(jobs.length,0);
  const enabled=await worker.fetch(req,{...env,ANALYTICS_ENABLED:'true'},ctx);
  assert.equal(await enabled.text(),'Quiz');assert.match(enabled.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal(jobs.length,1);await Promise.all(jobs);
  assert.equal(warning.mock.calls.length,1);
  assert.equal(warning.mock.calls[0].arguments[0],'Analytics event delivery failed');
  assert.deepEqual(warning.mock.calls[0].arguments[1],{kind:'Error',status:null});
});

test('visitor ID remains stable; opt-out and browser privacy signals prevent collection', async (t) => {
  t.mock.method(console,'warn',()=>{});
  const {default:worker,VISITOR_COOKIE}=await load();
  const env={ASSETS:{fetch:async()=>new Response('Quiz',{headers:{'content-type':'text/html'}})},ANALYTICS_ENABLED:'true',ANALYTICS_INGEST_URL:'https://invalid.test'};
  const jobs=[];const ctx={waitUntil:p=>jobs.push(p)};
  const id='11111111-1111-4111-8111-111111111111';
  const response=await worker.fetch(new Request('https://example.test/',{headers:{accept:'text/html',cookie:`${VISITOR_COOKIE}=${id}`}}),env,ctx);
  assert.equal(response.headers.get('set-cookie'),null);assert.equal(jobs.length,1);await Promise.all(jobs);
  for(const headers of [{cookie:'quiz_analytics_optout=1'},{'sec-gpc':'1'},{dnt:'1'}]) {
    let sent=false;
    const r=await worker.fetch(new Request('https://example.test/',{headers:{accept:'text/html',...headers}}),env,{waitUntil:()=>{sent=true;}});
    assert.equal(sent,false);assert.equal(r.headers.get('set-cookie'),null);
  }
});

test('enabled Worker sends teacher-compatible data and marks QA requests as tests', async (t) => {
  const delivered=t.mock.method(console,'info',()=>{});
  let payload;
  t.mock.method(globalThis,'fetch',async (_url, options)=>{payload=JSON.parse(options.body);return new Response(null,{status:200});});
  const {default:worker}=await load();const jobs=[];
  const req=new Request('https://quiz-app.quangmanh12082005.workers.dev/?token=private',{headers:{accept:'text/html','x-quiz-analytics-test':'1'}});
  const result=await worker.fetch(req,{ASSETS:{fetch:async()=>new Response('Quiz',{headers:{'content-type':'text/html'}})},ANALYTICS_ENABLED:'true',ANALYTICS_GROUP_ID:'01',ANALYTICS_INGEST_URL:'https://test.ingest.cloudflare.com'},{waitUntil:p=>jobs.push(p)});
  await Promise.all(jobs);
  assert.equal(payload.length,1);assert.equal(payload[0].id,'01');assert.equal(payload[0].meta.is_test,true);
  assert.equal(payload[0].meta.event,'page_view');assert.equal(payload[0].meta.site,'quiz-app.quangmanh12082005.workers.dev');
  assert.ok(payload[0].time>1700000000000);assert.equal(payload[0].ip,null);
  assert.match(result.headers.get('set-cookie'),new RegExp(payload[0].meta.visitor_id));
  assert.equal(JSON.parse(delivered.mock.calls[0].arguments[0]).status,200);
  assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(await result.text(),'Quiz');
});
