const pad = (value: number): string => String(value).padStart(2, '0')

const icsText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

const stamp = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hour = pad(date.getUTCHours())
  const minute = pad(date.getUTCMinutes())
  const second = pad(date.getUTCSeconds())
  return `${year}${month}${day}T${hour}${minute}${second}Z`
}

const wallClock = (day: string, hour: number, minute: number): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${match[1]}${match[2]}${match[3]}T${pad(hour)}${pad(minute)}00`
}

const fold = (line: string): string => {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 73) return line
  const parts: string[] = []
  let current = ''
  let currentBytes = 0
  let index = 0
  const limit = (): number => (index === 0 ? 73 : 72)
  for (const char of line) {
    const size = encoder.encode(char).length
    if (current.length > 0 && currentBytes + size > limit()) {
      parts.push(index === 0 ? current : ` ${current}`)
      current = char
      currentBytes = size
      index += 1
      continue
    }
    current += char
    currentBytes += size
  }
  if (current.length > 0) parts.push(index === 0 ? current : ` ${current}`)
  return parts.join('\r\n')
}

const calendarFile = (day: string, hour: number, seatId: string, rivalName: string, games: string): string | null => {
  const start = wallClock(day, hour, 0)
  const end = wallClock(day, hour, 10)
  if (!start || !end) return null
  const title = rivalName ? `Frizeplay contra ${rivalName}` : 'Frizeplay'
  const detail = games
    ? `Hora acordada para jugar ${games}. El código vale 10 minutos.`
    : 'Hora acordada para jugar el punto del mes. El código vale 10 minutos.'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Frizeplay//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:frizeplay-${icsText(seatId)}@frizeplay`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=Europe/Madrid:${start}`,
    `DTEND;TZID=Europe/Madrid:${end}`,
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(detail)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(title)}`,
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ]
  return lines.map((line) => fold(line)).join('\r\n')
}

const onPhone = (): boolean => {
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(agent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

let calendarReady = false

const askCalendarReady = (): void => {
  const worker = navigator.serviceWorker?.controller
  if (!worker) return
  const channel = new MessageChannel()
  channel.port1.onmessage = (event) => {
    calendarReady = event.data === 'calendar-ready'
  }
  worker.postMessage({ type: 'calendar-ready' }, [channel.port2])
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  askCalendarReady()
  navigator.serviceWorker.addEventListener('controllerchange', askCalendarReady)
}

const openInCalendar = (ics: string): boolean => {
  const worker = navigator.serviceWorker?.controller
  if (!worker || !calendarReady) return false
  const token = `${Date.now()}`
  worker.postMessage({ type: 'calendar', token, ics })
  const popup = window.open(`/frizeplay-calendar.ics?t=${token}`, '_blank')
  if (popup) return true
  window.location.assign(`/frizeplay-calendar.ics?t=${token}`)
  return true
}

const downloadCalendar = (ics: string, filename: string): void => {
  const file = new Blob([ics], { type: 'text/calendar' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 120000)
}

export type CalendarSave = 'calendar' | 'file'

export const saveAgreedHour = (day: string, hour: number, seatId: string, rivalName: string, games: string): CalendarSave | null => {
  const ics = calendarFile(day, hour, seatId, rivalName, games)
  if (!ics) return null
  if (onPhone() && openInCalendar(ics)) return 'calendar'
  downloadCalendar(ics, `frizeplay-${day}-${hour}.ics`)
  return 'file'
}
