import { describe, expect, it } from 'vitest'
import { addDays, parseDate, toDayNumber } from './dates'

describe('parseDate', () => {
  it('accepts ISO dates, slashes, single digits, and a trailing time', () => {
    expect(parseDate('2026-10-01')).toBe('2026-10-01')
    expect(parseDate('2026/10/1')).toBe('2026-10-01')
    expect(parseDate(' 2026-1-5 ')).toBe('2026-01-05')
    expect(parseDate('2026-10-01T14:30:00Z')).toBe('2026-10-01')
    expect(parseDate('2026-10-01 14:30')).toBe('2026-10-01')
  })

  it('refuses layouts where day and month could be swapped', () => {
    expect(parseDate('03/04/2026')).toBeNull()
    expect(parseDate('4 Oct 2026')).toBeNull()
  })

  it('refuses dates that do not exist', () => {
    expect(parseDate('2026-02-30')).toBeNull()
    expect(parseDate('2026-13-01')).toBeNull()
    expect(parseDate('2026-00-10')).toBeNull()
    expect(parseDate('')).toBeNull()
  })

  it('knows leap years', () => {
    expect(parseDate('2028-02-29')).toBe('2028-02-29')
    expect(parseDate('2026-02-29')).toBeNull()
  })
})

describe('day arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('counts days between dates', () => {
    expect(toDayNumber('2026-10-08') - toDayNumber('2026-10-01')).toBe(7)
    expect(toDayNumber('2026-03-29') - toDayNumber('2026-03-28')).toBe(1) // daylight saving week
  })
})
