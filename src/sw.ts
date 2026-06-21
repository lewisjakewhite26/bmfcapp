/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data?.json() as { title?: string; body?: string; url?: string } | undefined
    } catch {
      return { body: event.data?.text() }
    }
  })()

  const title = payload?.title ?? 'BMFC Club Hub'
  const body = payload?.body ?? 'You have a new update'
  const url = payload?.url ?? '/dashboard'

  const icon = new URL('/pwa-192.png', self.location.origin).href
  const badge = new URL('/pwa-badge-96.png', self.location.origin).href

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) ?? '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
