// Read-only production smoke check. Never submits a quiz or changes user data.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const base = 'https://quiz-app.quangmanh12082005.workers.dev/';

(async () => {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--in-process-gpu'] });
  fs.mkdirSync('test-results', { recursive: true });
  try {
    for (const [name, viewport] of Object.entries({ 'desktop-low': { width: 1366, height: 600 }, 'desktop-1366': { width: 1366, height: 768 }, desktop: { width: 1440, height: 900 }, 'desktop-1920': { width: 1920, height: 1080 }, mobile: { width: 390, height: 844 } })) {
      const page = await browser.newPage({ viewport });
      // Guard against timer-driven auto submission during read-only checks.
      await page.route('**/api/**', route => ['GET','HEAD','OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => console.log(`${name}: request failed ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`));
      const response = await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 });
      if (response.status() !== 200) throw new Error(`HTML HTTP ${response.status()}`);
      console.log(`${name}: HTML loaded`);
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).waitFor({ timeout: 30000 }).catch(async () => { console.log(`${name}: retry initial load once`); await page.reload({waitUntil:'domcontentloaded',timeout:45000}); await page.getByRole('button',{name:'Đăng nhập',exact:true}).waitFor({timeout:30000}); }).catch(async e => { console.log(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(0,700)})); await page.screenshot({path:`test-results/production-failure-${name}.png`,timeout:10000}); throw e; });
      await page.screenshot({ path: `test-results/production-${name}.png`, fullPage: true });
      if (viewport.width >= 1024) {
        const topicsResponse=await page.request.get('https://quiz-app-10-kln9.onrender.com/api/chude/thongke');
        const topic=(await topicsResponse.json()).find(t => t.soCauHoi > 0);
        if (!topic) throw new Error('No public topic with questions for layout verification');
        await page.getByRole('heading',{name:topic.tenChuDe,exact:true}).click();
        await page.locator('.quiz-main').waitFor();
        const main=await page.locator('.quiz-main').boundingBox(); const side=await page.locator('.quiz-sidebar').boundingBox();
        const ratio=main.width/(main.width+side.width);
        if(Math.abs(ratio-.67)>.01 || side.x < main.x+main.width || await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error(`Invalid desktop layout ${name}: ${ratio}`);
        const fixed=await page.evaluate(()=>{const visible=s=>{const r=document.querySelector(s).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;};return ! (document.documentElement.scrollHeight>innerHeight+1) && ['.quiz-header','.quiz-navigation','.quiz-submit-sidebar'].every(visible);});
        if(!fixed || errors.length) throw new Error(`Header/actions outside viewport or JS errors: ${name}`);
        await page.screenshot({path:`test-results/production-quiz-${name}.png`,fullPage:true});
        console.log(`${name}: production quiz 67/33, no horizontal overflow; GET only`);
        await page.close(); continue;
      }
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.getByPlaceholder('ten_dang_nhap').waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow || errors.length) throw new Error(JSON.stringify({ name, overflow, errors }));
      console.log(`${name}: HTML 200, topics loaded, login form visible, no horizontal overflow or JS errors`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
