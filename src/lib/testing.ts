import type { Row } from '../types'
import { addDays } from './dates'

/** Builds a row with sensible defaults, so tests only state what matters to them. */
export const row = (overrides: Partial<Row> = {}): Row => ({
  date: '2026-10-01',
  campaign: 'A',
  adSet: '(none)',
  impressions: 1000,
  reach: 0,
  clicks: 20,
  spend: 10,
  conversions: 0,
  revenue: 0,
  ...overrides,
})

/** One row per day for `days` days, built by a function of the day index. */
export const series = (days: number, make: (index: number) => Partial<Row>, start = '2026-10-01'): Row[] =>
  Array.from({ length: days }, (_, index) => row({ date: addDays(start, index), ...make(index) }))
