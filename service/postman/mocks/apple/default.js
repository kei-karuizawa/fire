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
  if (!req.headers.authorization?.startsWith('Bearer ') && url.pathname.startsWith('/v1/')) {
    return send(401, { errors: [{ code: 'NOT_AUTHORIZED' }] });
  }
  if (url.pathname === '/v1/apps') {
    return send(200, { data: [
      { type: 'apps', id: '123456789', attributes: { name: 'My App', bundleId: 'com.example.myapp', sku: 'MYAPP', primaryLocale: 'en-US' } },
      { type: 'apps', id: '222222222', attributes: { name: 'Paper Kettle', bundleId: 'com.example.kettle', sku: 'KETTLE', primaryLocale: 'en-US' } },
    ] });
  }
  const sub = url.pathname.match(/^\/v1\/apps\/([A-Za-z0-9_-]+)\/(appInfos|appStoreVersions|builds)$/);
  if (sub) {
    const id = sub[1];
    const kind = sub[2];
    if (id === '222222222') {
      if (kind === 'appInfos') return send(200, { data: [] });
      if (kind === 'builds') return send(200, { data: [build('kettle-build', '7', '2026-04-01T00:00:00Z', 'VALID', false)] });
      return send(200, { data: [version('kettle-ver', '1.0.0', '2026-04-02T00:00:00Z', 'PREPARE_FOR_SUBMISSION')] });
    }
    if (id !== '123456789') return send(404, { errors: [{ code: 'NOT_FOUND' }] });
    if (kind === 'appInfos') {
      return send(200, { data: [{ type: 'appInfos', id: 'info-1', attributes: { appStoreState: 'READY_FOR_SALE', appStoreAgeRating: '4+' } }] });
    }
    if (kind === 'builds') {
      return send(200, { data: [
        build('build-90', '90', '2025-01-01T00:00:00Z', 'VALID', true),
        build('build-103', '103', '2026-10-01T00:00:00Z', 'VALID', false),
        build('build-102', '102', '2026-08-01T00:00:00Z', 'PROCESSING', false),
      ] });
    }
    return send(200, { data: [
      version('ver-1', '2.4.0', '2026-09-01T00:00:00Z', 'READY_FOR_SALE'),
      version('ver-0', '2.3.0', '2026-05-01T00:00:00Z', 'READY_FOR_SALE'),
    ] });
  }
  if (url.pathname === '/v1/appStoreVersions/ver-1/appStoreVersionLocalizations') {
    return send(200, { data: [
      versionLoc('vloc-en', 'en-US', 'A field notebook that works offline, from trailhead to camp.', 'trail,notes,offline', 'Maps for the long way home.', 'Offline packs and a quieter compass.'),
      versionLoc('vloc-zh', 'zh-Hans', '从山口到营地，都能离线使用的野外笔记。', '山径,笔记,离线', '把路记在口袋里。', '离线地图和更安静的指南针。'),
    ] });
  }
  if (url.pathname === '/v1/appStoreVersions/ver-0/appStoreVersionLocalizations') {
    return send(200, { data: [versionLoc('vloc-old', 'en-US', 'Earlier trail notes.', 'trail,notes', '', 'The first paper maps.')] });
  }
  if (url.pathname === '/v1/appStoreVersions/kettle-ver/appStoreVersionLocalizations') {
    return send(200, { data: [versionLoc('kettle-loc', 'en-US', 'A kettle timer for slow mornings.', 'kettle,tea', 'Boil, pour, wait.', 'First release.')] });
  }
  if (url.pathname === '/v1/appStoreVersionLocalizations/vloc-en/appScreenshotSets') {
    return send(200, { data: [
      { type: 'appScreenshotSets', id: 'set-phone', attributes: { screenshotDisplayType: 'APP_IPHONE_67' } },
      { type: 'appScreenshotSets', id: 'set-pad', attributes: { screenshotDisplayType: 'APP_IPAD_PRO_3GEN_129' } },
    ] });
  }
  if (url.pathname === '/v1/appScreenshotSets/set-phone/appScreenshots') {
    return send(200, { data: [
      shot('shot-1', 'trail.png', 390, 844),
      shot('shot-2', 'camp.png', 390, 844),
    ] });
  }
  if (url.pathname === '/v1/appScreenshotSets/set-pad/appScreenshots') {
    return send(200, { data: [shot('shot-3', 'ridge.png', 1024, 1366)] });
  }
  if (url.pathname.endsWith('/appScreenshotSets') || url.pathname.endsWith('/appScreenshots')) {
    return send(200, { data: [] });
  }
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
    if (id === '222222222') {
      return send(200, { data: { type: 'apps', id, attributes: { name: 'Paper Kettle', bundleId: 'com.example.kettle', sku: 'KETTLE', primaryLocale: 'en-US' } } });
    }
    return send(200, { data: {type: 'apps', id, attributes: {name: 'My App', bundleId: 'com.example.myapp', sku: 'MYAPP', primaryLocale: 'en-US'}} });
  }
  const info = url.pathname.match(/^\/v1\/appInfos\/([A-Za-z0-9_-]+)$/);
  if (info) {
    if (url.searchParams.get('include') !== 'app') return send(400, {errors: [{code: 'INVALID_QUERY'}]});
    return send(200, { data: {type: 'appInfos', id: info[1], relationships: {app: {data: {type: 'apps', id: info[1] === 'other-app' ? '999' : '123456789'}}}} });
  }
  if (url.pathname === '/v1/appInfos/info-1/appInfoLocalizations') {
    const locale = url.searchParams.get('filter[locale]');
    if (locale) {
      if (url.searchParams.get('limit') !== '1') return send(400, {errors: [{code: 'INVALID_QUERY'}]});
      return send(200, {data: locale === 'zh-Hans' ? [{type: 'appInfoLocalizations', id: 'loc-1', attributes: {name: '我的应用', locale}}] : []});
    }
    return send(200, { data: [
      { type: 'appInfoLocalizations', id: 'loc-en', attributes: { locale: 'en-US', name: 'My App', subtitle: 'Notes for the long way', privacyPolicyUrl: 'https://example.com/privacy' } },
      { type: 'appInfoLocalizations', id: 'loc-zh', attributes: { locale: 'zh-Hans', name: '我的应用', subtitle: '山径笔记', privacyPolicyUrl: 'https://example.com/privacy' } },
    ] });
  }
  send(501, {error: 'Endpoint not modeled'});
}).listen(process.env.PORT || 4500);

function version(id, versionString, createdDate, state) {
  return { type: 'appStoreVersions', id, attributes: { platform: 'IOS', versionString, appStoreState: state, copyright: '2026 Example', releaseType: 'AFTER_APPROVAL', createdDate } };
}
function versionLoc(id, locale, description, keywords, promotionalText, whatsNew) {
  return { type: 'appStoreVersionLocalizations', id, attributes: { locale, description, keywords, promotionalText, whatsNew, supportUrl: 'https://example.com/support', marketingUrl: 'https://example.com' } };
}
function build(id, version, uploadedDate, processingState, expired) {
  return { type: 'builds', id, attributes: { version, uploadedDate, expirationDate: '2027-01-01T00:00:00Z', expired, processingState, minOsVersion: '17.0', usesNonExemptEncryption: false } };
}
function shot(id, fileName, width, height) {
  return { type: 'appScreenshots', id, attributes: { fileName, fileSize: 120000, imageAsset: { templateUrl: 'https://placehold.co/{w}x{h}.{f}', width, height }, assetDeliveryState: { state: 'COMPLETE' } } };
}
