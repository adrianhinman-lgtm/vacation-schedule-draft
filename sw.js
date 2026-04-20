const CACHE = 'vacation-draft-v3';

self.addEventListener('install', e => {
  // Skip waiting immediately so new SW activates right away
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches on activation
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go to network for API calls and external resources
  if (
    url.includes('supabase.co') ||
    url.includes('resend.com') ||
    url.includes('fonts.google') ||
    url.includes('fonts.gstatic') ||
    url.includes('api/')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for everything else — always try to get fresh version
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Cache the fresh response
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => {
        // Only fall back to cache if network fails (offline)
        return caches.match(e.request);
      })
  );
});
