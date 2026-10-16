// Local, synthetic fixtures based on Apple's documented JSON:API resource shapes.
// This mock does not establish acceptance of a JWT by Apple's live service.
const http = require('http');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'GET') return send(501, { error: 'Endpoint not modeled' });
  const app = url.pathname.match(/^\/v1\/apps\/([A-Za-z0-9_-]+)$/);
  if (app) {
    const id = app[1];
    if (!req.headers.authorization?.startsWith('Bearer ')) return send(401, { errors: [{ code: 'NOT_AUTHORIZED' }] });
    if (['401', '403', '404', '429', '500'].includes(id)) {
      if (id === '429') res.setHeader('Retry-After', '30');
      return send(Number(id), { errors: [{ code: 'SIMULATED', detail: 'PRIVATE_UPSTREAM_SENTINEL' }] });
    }
    if (id === 'malformed') { res.writeHead(200, {'Content-Type': 'text/html'}); return res.end('<html>bad gateway</html>'); }
    if (id === 'redirect') { res.writeHead(302, {Location: 'https://example.invalid/never-follow'}); return res.end(); }
    return send(200, { data: {type: 'apps', id, attributes: {name: 'My App', primaryLocale: 'en-US'}} });
  }
  const info = url.pathname.match(/^\/v1\/appInfos\/([A-Za-z0-9_-]+)$/);
  if (info) {
    if (url.searchParams.get('include') !== 'app') return send(400, {errors: [{code: 'INVALID_QUERY'}]});
    return send(200, { data: {type: 'appInfos', id: info[1], relationships: {app: {data: {type: 'apps', id: info[1] === 'other-app' ? '999' : '123456789'}}}} });
  }
  if (url.pathname === '/v1/appInfos/info-1/appInfoLocalizations') {
    const locale = url.searchParams.get('filter[locale]');
    if (url.searchParams.get('limit') !== '1' || !locale) return send(400, {errors: [{code: 'INVALID_QUERY'}]});
    return send(200, {data: locale === 'zh-Hans' ? [{type: 'appInfoLocalizations', id: 'loc-1', attributes: {name: '我的应用', locale}}] : []});
  }
  send(501, {error: 'Endpoint not modeled'});
}).listen(process.env.PORT || 4500);
