import type { DailyRaffle } from '../api/raffleApi'

const noticeKey = (userId: string): string => `frizeplay.raffle.notice.${userId}`

const hourToConfirm = (raffle: DailyRaffle): boolean =>
  raffle.seats.some((seat) => seat.yours && seat.agreedHour === null && seat.rivalHours.length > 0 && seat.yourHours.length === 0)

const hasProfileMessage = (raffle: DailyRaffle): boolean =>
  raffle.youRest || Boolean(raffle.tiebreakNote) || hourToConfirm(raffle)

export const noticeOf = (raffle: DailyRaffle): string => {
  const seats = raffle.seats
    .filter((seat) => seat.yours)
    .map((seat) => [
      seat.id,
      seat.rivalHours.join(','),
      seat.yourTurn ? '1' : '0',
      seat.agreedHour ?? '',
      seat.cleared ? '1' : '0',
      seat.blocked.join(','),
      seat.waitingGameId ?? '',
      seat.waitingName ?? '',
      seat.waitingYours ? '1' : '0',
      seat.offerLocked ? '1' : '0',
      seat.agreedHour === null && seat.rivalHours.length > 0 && seat.yourHours.length === 0 ? 'confirm' : '',
    ].join(':'))
    .join('|')
  return [raffle.day, raffle.youRest ? 'libre' : '', raffle.tiebreakNote ?? '', seats].join('#')
}

export const hasFreshNotice = (userId: string, raffle: DailyRaffle): boolean => {
  const next = noticeOf(raffle)
  const seen = window.localStorage.getItem(noticeKey(userId))
  if (seen === null && !hasProfileMessage(raffle)) {
    window.localStorage.setItem(noticeKey(userId), next)
    return false
  }
  return seen !== next
}

export const markNoticeSeen = (userId: string, raffle: DailyRaffle): void => {
  window.localStorage.setItem(noticeKey(userId), noticeOf(raffle))
}
