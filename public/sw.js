self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

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

let calendarFile = ''
let calendarToken = ''
let calendarWait = null

const calendarResponse = (body) => {
  if (!body) return new Response('', { status: 404, headers: { 'Cache-Control': 'no-store' } })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="frizeplay.ics"',
      'Cache-Control': 'no-store',
    },
  })
}

self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'calendar-ready') {
    if (event.ports[0]) event.ports[0].postMessage('calendar-ready')
    return
  }
  if (event.data.type !== 'calendar') return
  calendarFile = typeof event.data.ics === 'string' ? event.data.ics : ''
  calendarToken = typeof event.data.token === 'string' ? event.data.token : ''
  if (!calendarWait || calendarWait.token !== calendarToken) return
  calendarWait.reply(calendarFile)
  calendarWait = null
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname !== '/frizeplay-calendar.ics') return
  const token = url.searchParams.get('t') || ''
  event.respondWith(new Promise((resolve) => {
    const reply = (body) => resolve(calendarResponse(body))
    if (calendarToken === token && calendarFile) {
      reply(calendarFile)
      return
    }
    calendarWait = { token, reply }
    setTimeout(() => {
      if (!calendarWait || calendarWait.token !== token) return
      calendarWait = null
      reply('')
    }, 3000)
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
