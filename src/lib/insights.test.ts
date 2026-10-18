import { describe, expect, it } from 'vitest'
import { generateInsights } from './insights'
import { generateSample } from './sample'
import { row, series } from './testing'
import { DEFAULT_THRESHOLDS } from '../types'

const titles = (rows: Parameters<typeof generateInsights>[0], ...rest: unknown[]) =>
  generateInsights(rows, ...(rest as [])).map((i) => i.title)

describe('generateInsights on the sample data', () => {
  const rows = generateSample(60, 42)

  it('finds every problem that was built into the sample', () => {
    const insights = generateInsights(rows)
    const found = insights.map((i) => i.title)
    expect(found).toContain('Best return: Retargeting - Cart Abandoners')
    expect(found).toContain('No conversions: Broad - Video Views')
    expect(found).toContain('High ad frequency: Retargeting - Cart Abandoners')
    const trend = insights.find((i) => i.kind === 'trend')
    expect(trend?.severity).toBe('warning')
    expect(trend?.title).toContain('cost per result is up')
  })

  it('lists warnings before good news', () => {
    const order = generateInsights(rows).map((i) => i.severity)
    const rank = { warning: 0, good: 1, info: 2 } as const
    expect(order).toEqual([...order].sort((a, b) => rank[a] - rank[b]))
  })

  it('uses the thresholds it is given', () => {
    const strict = generateInsights(rows, 'USD', { ...DEFAULT_THRESHOLDS, frequencyLimit: 10 })
    expect(strict.some((i) => i.kind === 'frequency')).toBe(false)
    const loose = generateInsights(rows, 'USD', { ...DEFAULT_THRESHOLDS, frequencyLimit: 1 })
    expect(loose.filter((i) => i.kind === 'frequency').length).toBeGreaterThanOrEqual(2)
  })

  it('puts the currency in the text', () => {
    const waste = generateInsights(rows, 'PKR').find((i) => i.kind === 'waste')
    expect(waste?.detail).toContain('PKR')
  })
})

describe('individual rules', () => {
  it('reports no conversion problems for a file without conversions', () => {
    const rows = [row({ campaign: 'A', spend: 10 }), row({ campaign: 'B', spend: 90 })]
    expect(generateInsights(rows).some((i) => i.kind === 'waste')).toBe(false)
  })

  it('reports no issues for a healthy account', () => {
    expect(titles([row()])).toEqual(['No issues found'])
  })

  it('returns nothing for no data', () => {
    expect(generateInsights([])).toEqual([])
  })

  it('needs two weeks of data before it talks about a trend', () => {
    const rows = series(13, (i) => ({ conversions: 2, spend: 10 + i * 5 }))
    expect(generateInsights(rows).some((i) => i.kind === 'trend')).toBe(false)
  })

  it('treats a falling cost per result as good news', () => {
    const rows = series(14, (i) => ({ conversions: i < 7 ? 1 : 4, spend: 40 }))
    const trend = generateInsights(rows).find((i) => i.kind === 'trend')
    expect(trend?.severity).toBe('good')
    expect(trend?.title).toContain('down')
  })

  it('does not divide by a zero baseline when last week had no clicks', () => {
    // Without conversions the trend uses click-through rate. The earlier week has zero clicks.
    const rows = series(14, (i) => ({ clicks: i < 7 ? 0 : 20 }))
    const insights = generateInsights(rows)
    expect(insights.some((i) => i.kind === 'trend')).toBe(false)
    expect(JSON.stringify(insights)).not.toMatch(/Infinity|NaN/)
  })

  it('only judges campaigns that hold enough of the spend', () => {
    const rows = [
      row({ campaign: 'Big', spend: 970, conversions: 10, revenue: 2000 }),
      row({ campaign: 'Tiny', spend: 30, conversions: 0 }),
      row({ campaign: 'Other', spend: 100, conversions: 1, revenue: 20 }),
    ]
    expect(titles(rows)).not.toContain('No conversions: Tiny')
    expect(titles(rows, 'USD', { ...DEFAULT_THRESHOLDS, minSpendShare: 0.01 })).toContain('No conversions: Tiny')
  })

  it('ranks by cost per result when no revenue is tracked', () => {
    const rows = [
      row({ campaign: 'Cheap', spend: 50, conversions: 10 }),
      row({ campaign: 'Costly', spend: 50, conversions: 2 }),
    ]
    expect(titles(rows)).toEqual(
      expect.arrayContaining(['Cheapest results: Cheap', 'Most expensive results: Costly']),
    )
  })
})
