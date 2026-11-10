import type { DailyRaffle } from '../api/raffleApi'

const noticeKey = (userId: string): string => `frizeplay.raffle.notice.${userId}`

export const noticeOf = (raffle: DailyRaffle): string => raffle.seats
  .filter((seat) => seat.yours)
  .map((seat) => [
    seat.id,
    seat.rivalHour ?? '',
    seat.agreedHour ?? '',
    seat.cleared ? '1' : '0',
    seat.blocked.join(','),
    seat.waitingGameId ?? '',
    seat.waitingName ?? '',
    seat.waitingYours ? '1' : '0',
  ].join(':'))
  .join('|')

export const hasFreshNotice = (userId: string, raffle: DailyRaffle): boolean => {
  const next = noticeOf(raffle)
  const seen = window.localStorage.getItem(noticeKey(userId))
  if (seen === null) {
    window.localStorage.setItem(noticeKey(userId), next)
    return false
  }
  return seen !== next
}

export const markNoticeSeen = (userId: string, raffle: DailyRaffle): void => {
  window.localStorage.setItem(noticeKey(userId), noticeOf(raffle))
}
