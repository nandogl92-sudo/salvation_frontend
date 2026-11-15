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

export const agreedHourIcs = (day: string, hour: number, seatId: string, rivalName: string, games: string): string | null => {
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

const isApplePhone = (): boolean => {
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

const isAndroidPhone = (): boolean => /Android/i.test(navigator.userAgent)

const googleCalendarUrl = (day: string, hour: number, title: string, detail: string): string | null => {
  const start = wallClock(day, hour, 0)
  const end = wallClock(day, hour, 10)
  if (!start || !end) return null
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: detail,
    ctz: 'Europe/Madrid',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
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

const isMobile = (): boolean => {
  if (isApplePhone() || isAndroidPhone()) return true
  if (/Mobile/i.test(navigator.userAgent)) return true
  return window.matchMedia('(pointer: coarse)').matches
}

export type PhoneCalendarLink = { kind: 'apple' | 'android'; href: string }

export const phoneCalendarLink = (day: string, hour: number, seatId: string, rivalName: string, games: string): PhoneCalendarLink | null => {
  if (!isMobile()) return null
  const title = rivalName ? `Frizeplay contra ${rivalName}` : 'Frizeplay'
  const detail = games
    ? `Hora acordada para jugar ${games}. El código vale 10 minutos.`
    : 'Hora acordada para jugar el punto del mes. El código vale 10 minutos.'
  if (isAndroidPhone()) {
    const href = googleCalendarUrl(day, hour, title, detail)
    if (!href) return null
    return { kind: 'android', href }
  }
  const params = new URLSearchParams({
    day,
    hour: String(hour),
    seat: seatId,
    rival: rivalName,
    games,
  })
  return { kind: 'apple', href: `webcal://${window.location.host}/frizeplay-calendar.ics?${params.toString()}` }
}

export const saveAgreedHour = (day: string, hour: number, seatId: string, rivalName: string, games: string): boolean => {
  const ics = agreedHourIcs(day, hour, seatId, rivalName, games)
  if (!ics) return false
  downloadCalendar(ics, `frizeplay-${day}-${hour}.ics`)
  return true
}
