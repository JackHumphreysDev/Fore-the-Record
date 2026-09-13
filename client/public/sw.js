const OFFLINE_CACHE = 'fore-the-record-offline-v1'
const OFFLINE_PAGE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(
        new URL(OFFLINE_PAGE, self.location.origin),
        { cache: 'reload' },
      )))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('fore-the-record-offline-') && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    (url.pathname === '/api' || url.pathname.startsWith('/api/'))
  ) {
    return
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE)
      return (await cache.match(OFFLINE_PAGE)) ?? Response.error()
    }),
  )
})
