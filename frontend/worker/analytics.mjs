// StreamInfo.docx: group ID string, timestamp in milliseconds, optional JSON meta.
export const VISITOR_COOKIE = 'quiz_analytics_visitor';
export const OPTOUT_COOKIE = 'quiz_analytics_optout';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function cookie(request, name) {
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
}
export function detectDevice(userAgent = '') {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Windows|Macintosh|X11|Linux/i.test(userAgent)) return 'pc';
  return 'unknown';
}

export function isPageView(request, response) {
  return request.method === 'GET'
    && request.headers.get('accept')?.includes('text/html') === true
    && response.status >= 200 && response.status < 300
    && response.headers.get('content-type')?.includes('text/html') === true;
}

export function createEvent(request, { now = Date.now(), groupId = '01', eventId = crypto.randomUUID(), visitorId = null, isTest = false } = {}) {
  const country = request.cf?.country;
  const url = new URL(request.url);
  return {
    id: groupId,
    country: typeof country === 'string' && /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null,
    device: detectDevice(request.headers.get('user-agent') || ''),
    time: now, // StreamInfo.docx explicitly declares timestamp / millisecond.
    ip: null, // Raw visitor IP is not needed for page views/countries/device types.
    meta: { event: 'page_view', event_id: eventId, visitor_id: visitorId, site: url.hostname, path: url.pathname, is_test: isTest },
  };
}

export async function sendEvent(event, env, fetcher = fetch) {
  const endpoint = new URL(env.ANALYTICS_INGEST_URL);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.ingest.cloudflare.com')
      || endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error('Invalid analytics endpoint');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (env.ANALYTICS_INGEST_TOKEN) headers.Authorization = `Bearer ${env.ANALYTICS_INGEST_TOKEN}`;
  const response = await fetcher.call(globalThis, endpoint.toString(), {
    method: 'POST', headers, body: JSON.stringify([event]),
    // Workers supports manual/follow, not Node's redirect:error.
    // Reject 3xx below rather than forwarding analytics to another destination.
    signal: AbortSignal.timeout(15000), redirect: 'manual',
  });
  if (!response.ok) {
    const error = new Error(`Analytics HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.status;
}

export default {
  async fetch(request, env, ctx) {
    const response = await env.ASSETS.fetch(request);
    if (env.ANALYTICS_ENABLED === 'true' && env.ANALYTICS_INGEST_URL && isPageView(request, response)
        && cookie(request, OPTOUT_COOKIE) !== '1' && request.headers.get('sec-gpc') !== '1' && request.headers.get('dnt') !== '1') {
      const existingVisitor = cookie(request, VISITOR_COOKIE);
      const visitorId = existingVisitor && UUID.test(existingVisitor) ? existingVisitor : crypto.randomUUID();
      const event = createEvent(request, {
        groupId: env.ANALYTICS_GROUP_ID || '01', visitorId,
        isTest: request.headers.get('x-quiz-analytics-test') === '1',
      });
      ctx.waitUntil(sendEvent(event, env).then(status => {
        if (event.meta.is_test) console.info(JSON.stringify({ event: 'analytics_delivery', status, event_id: event.meta.event_id }));
      }).catch(error => {
        // Do not log endpoint tokens, visitor IPs, or request bodies.
        console.warn('Analytics event delivery failed', {
          kind: error.name, status: error.status ?? null,
          ...(event.meta.is_test && error.name === 'TypeError' ? {
            detail: error.message.replace(/https?:\/\/\S+/g, '[url]').slice(0, 200),
          } : {}),
        });
      }));
      if (visitorId !== existingVisitor) {
        const result = new Response(response.body, response);
        result.headers.append('Set-Cookie', `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`);
        result.headers.set('Cache-Control', 'private, no-store');
        return result;
      }
    }
    return response;
  },
};
