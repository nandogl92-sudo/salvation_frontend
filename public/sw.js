self.addEventListener('push', (event) => {
  let note = { title: 'Frizeplay', body: 'Tienes un aviso nuevo.', url: '/' }
  try {
    if (event.data) note = { ...note, ...event.data.json() }
  } catch {
    note = { title: 'Frizeplay', body: 'Tienes un aviso nuevo.', url: '/' }
  }
  event.waitUntil(self.registration.showNotification(note.title, {
    body: note.body,
    icon: '/frizeplay-logo.png',
    badge: '/frizeplay-logo.png',
    data: { url: note.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const open = windows.find((windowClient) => 'focus' in windowClient)
    if (open) return open.focus()
    return self.clients.openWindow(url)
  }))
})
