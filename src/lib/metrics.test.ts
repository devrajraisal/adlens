import { describe, expect, it } from 'vitest'
import { byCampaign, byDay, ratesOf, ratio, summarize } from './metrics'
import { generateSample } from './sample'
import { row } from './testing'

describe('rates', () => {
  it('follows the standard formulas', () => {
    const rates = ratesOf({ impressions: 10000, clicks: 200, spend: 100, conversions: 10, revenue: 400 })
    expect(rates.ctr).toBeCloseTo(0.02)
    expect(rates.cpc).toBeCloseTo(0.5)
    expect(rates.cpm).toBeCloseTo(10)
    expect(rates.convRate).toBeCloseTo(0.05)
    expect(rates.cpa).toBeCloseTo(10)
    expect(rates.roas).toBeCloseTo(4)
  })

  it('returns null, not NaN or Infinity, when a denominator is zero', () => {
    const rates = ratesOf({ impressions: 0, clicks: 0, spend: 5, conversions: 0, revenue: 0 })
    expect([rates.ctr, rates.cpc, rates.cpm, rates.convRate, rates.cpa]).toEqual([null, null, null, null, null])
    expect(ratio(1, 0)).toBeNull()
  })
})

describe('summarize', () => {
  it('adds up totals and describes the period', () => {
    const summary = summarize([
      row({ date: '2026-10-02', campaign: 'B', impressions: 3000, clicks: 40, spend: 30 }),
      row({ date: '2026-10-01', campaign: 'A' }),
    ])
    expect(summary).toMatchObject({ impressions: 4000, clicks: 60, spend: 40, days: 2, campaigns: 2,
      start: '2026-10-01', end: '2026-10-02' })
  })

  it('has no ROAS or cost per result when nothing was tracked', () => {
    const summary = summarize([row()])
    expect(summary.roas).toBeNull()
    expect(summary.cpa).toBeNull()
    expect(summary.hasConversions).toBe(false)
    expect(summary.hasRevenue).toBe(false)
  })
})

describe('grouping', () => {
  const rows = generateSample(30, 7)

  it('sorts campaigns by spend and shares add up to one', () => {
    const campaigns = byCampaign(rows)
    expect(campaigns).toHaveLength(5)
    const spends = campaigns.map((c) => c.spend)
    expect(spends).toEqual([...spends].sort((a, b) => b - a))
    expect(campaigns.reduce((sum, c) => sum + c.spendShare, 0)).toBeCloseTo(1)
  })

  it('returns one row per day in order', () => {
    const days = byDay(rows)
    expect(days).toHaveLength(30)
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort())
  })

  it('keeps a campaign with zero revenue at ROAS 0 inside an account that has revenue', () => {
    const video = byCampaign(rows).find((c) => c.campaign.startsWith('Broad'))
    expect(video?.roas).toBe(0)
  })
})
