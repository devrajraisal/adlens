const DAY_MS = 86_400_000

/** Whole days since 1970-01-01 for a YYYY-MM-DD string. Uses UTC, so time zones cannot shift it. */
export function toDayNumber(iso: string): number {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function fromDayNumber(days: number): string {
  return new Date(days * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(toDayNumber(iso) + days)
}

/**
 * Accepts YYYY-MM-DD or YYYY/MM/DD, with an optional time after it, and returns YYYY-MM-DD.
 * Other layouts such as 03/04/2026 are refused on purpose, because day and month can be swapped.
 */
export function parseDate(value: string): string | null {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  const real =
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
  return real ? check.toISOString().slice(0, 10) : null
}
