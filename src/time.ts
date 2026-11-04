import { EchoasciiError } from './errors'

const pad = (n: number) => String(n).padStart(2, '0')

/** "90", "90s", "5m", "1h30m", "1h 30m 15s", "10:00" or "1:00:00" in ms */
export const parseDuration = (value: string): number => {
  const input = value.trim().toLowerCase()

  if (/^\d+(\.\d+)?$/.test(input)) return Number(input) * 1000

  const clock = input.match(/^(?:(\d+):)?(\d+):(\d{2})$/)
  if (clock) {
    const [, hours = '0', minutes = '0', seconds = '0'] = clock
    return (
      ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000
    )
  }

  const units = input.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/)
  if (units && input) {
    const [, hours = '0', minutes = '0', seconds = '0'] = units
    return (
      ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000
    )
  }

  throw new EchoasciiError(
    `Can't read "${value}" as a duration. Try 90, 90s, 5m, 1h30m or 10:00`,
  )
}

/** 24 hour local time, like 09:05:30 */
export const formatClock = (date: Date): string =>
  [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join(':')

/** Remaining time rounded up, so it shows 00:00 only when time is up */
export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}
