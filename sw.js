/* Rajput Traders - minimal service worker.
   Makes the site installable. It does not cache pages, so visitors always see
   the latest content; when offline it shows a small page with the phone number. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
var OFFLINE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - Rajput Traders</title></head>' +
  '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FCECCF;color:#3F2505;font-family:Poppins,Arial,sans-serif;text-align:center;padding:24px">' +
  '<div><h1 style="margin:0 0 8px">Rajput Traders</h1><p>You are offline. Please check your internet connection and try again.</p>' +
  '<p>To order now, call <a href="tel:+919927637594" style="color:#3F2505;font-weight:700">99276 37594</a></p></div></body></html>';
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
