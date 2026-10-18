import { describe, expect, it } from 'vitest'
import { buildSummaryJson } from './exportSummary'
import { money, multiple, normalizeCurrency, percent, whole } from './format'
import { byCampaign, summarize } from './metrics'
import { row } from './testing'

describe('format', () => {
  it('formats numbers and shows n/a for missing values', () => {
    expect(money(1234.5, 'PKR')).toBe('1,234.50 PKR')
    expect(percent(0.0234)).toBe('2.34%')
    expect(whole(12500.4)).toBe('12,500')
    expect(multiple(7.694)).toBe('7.69x')
    for (const f of [money, percent, whole, multiple]) expect(f(null)).toBe('n/a')
    expect(money(Number.NaN)).toBe('n/a')
  })

  it('accepts only three letter currency codes', () => {
    expect(normalizeCurrency(' pkr ')).toBe('PKR')
    expect(normalizeCurrency('dollars')).toBe('USD')
    expect(normalizeCurrency('')).toBe('USD')
  })
})

describe('buildSummaryJson', () => {
  it('writes null for missing rates and never NaN', () => {
    const rows = [row({ impressions: 0, clicks: 0 })]
    const text = buildSummaryJson(summarize(rows), byCampaign(rows), [], ['note'])
    expect(text).not.toMatch(/NaN|Infinity/)
    expect(JSON.parse(text).summary.ctr).toBeNull()
    expect(JSON.parse(text).warnings).toEqual(['note'])
  })
})
