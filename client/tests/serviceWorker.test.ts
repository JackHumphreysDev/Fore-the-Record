import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type FetchEvent = {
  request: { url: string; mode: string }
  respondWith: ReturnType<typeof vi.fn>
}

function loadWorker() {
  const handlers = new Map<string, (event: FetchEvent) => void>()
  const offlineResponse = new Response('You are offline')
  const cache = {
    add: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(offlineResponse),
  }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  }
  const fetch = vi.fn()
  const self = {
    location: { origin: 'https://fore-the-record.vercel.app' },
    addEventListener: (name: string, handler: (event: FetchEvent) => void) => {
      handlers.set(name, handler)
    },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
  }
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
  runInNewContext(source, { self, caches, fetch, Request, Response, URL })
  return { handlers, cache, caches, fetch, offlineResponse }
}

describe('offline service worker', () => {
  it('prepares only the public offline page for caching', async () => {
    const { handlers, cache, caches } = loadWorker()
    const event = { waitUntil: vi.fn() }
    handlers.get('install')?.(event as unknown as FetchEvent)

    expect(event.waitUntil).toHaveBeenCalledOnce()
    await event.waitUntil.mock.calls[0][0]
    expect(caches.open).toHaveBeenCalledWith('fore-the-record-offline-v1')
    expect(cache.add).toHaveBeenCalledOnce()
    expect(cache.add.mock.calls[0][0].url).toBe(
      'https://fore-the-record.vercel.app/offline.html',
    )
  })

  it('never intercepts authenticated API requests', () => {
    const { handlers, fetch } = loadWorker()
    const event: FetchEvent = {
      request: {
        url: 'https://fore-the-record.vercel.app/api/users/me',
        mode: 'navigate',
      },
      respondWith: vi.fn(),
    }
    handlers.get('fetch')?.(event)
    expect(event.respondWith).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not cache live pages or account data during normal navigation', async () => {
    const { handlers, caches, fetch } = loadWorker()
    const page = new Response('Live app')
    fetch.mockResolvedValueOnce(page)
    const event: FetchEvent = {
      request: {
        url: 'https://fore-the-record.vercel.app/',
        mode: 'navigate',
      },
      respondWith: vi.fn(),
    }
    handlers.get('fetch')?.(event)
    await expect(event.respondWith.mock.calls[0][0]).resolves.toBe(page)
    expect(caches.open).not.toHaveBeenCalled()
  })

  it('shows only the offline page when navigation has no network', async () => {
    const { handlers, cache, fetch, offlineResponse } = loadWorker()
    fetch.mockRejectedValueOnce(new Error('Network unavailable'))
    const event: FetchEvent = {
      request: {
        url: 'https://fore-the-record.vercel.app/',
        mode: 'navigate',
      },
      respondWith: vi.fn(),
    }
    handlers.get('fetch')?.(event)
    expect(event.respondWith).toHaveBeenCalledOnce()
    await expect(event.respondWith.mock.calls[0][0]).resolves.toBe(offlineResponse)
    expect(cache.match).toHaveBeenCalledWith('/offline.html')
    expect(cache.add).not.toHaveBeenCalled()
  })
})
