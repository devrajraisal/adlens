import { describe, expect, it } from 'vitest'
import { buildRows, guessMapping, parseCsv } from './csv'
import { createRandom, generateSample, rowsToCsv } from './sample'

describe('generateSample', () => {
  it('is identical for the same seed and different for another', () => {
    expect(generateSample(10, 1)).toEqual(generateSample(10, 1))
    expect(generateSample(10, 1)).not.toEqual(generateSample(10, 2))
  })

  it('has one row per day, campaign, and ad set', () => {
    expect(generateSample(7)).toHaveLength(7 * 5 * 2)
  })

  it('never produces impossible numbers', () => {
    for (const r of generateSample(20)) {
      expect(r.clicks).toBeLessThanOrEqual(r.impressions)
      expect(r.conversions).toBeLessThanOrEqual(r.clicks)
      expect(Math.min(r.impressions, r.clicks, r.spend, r.conversions, r.revenue, r.reach)).toBeGreaterThanOrEqual(0)
    }
  })

  it('rejects a bad number of days', () => {
    expect(() => generateSample(0)).toThrow(RangeError)
    expect(() => generateSample(2.5)).toThrow(RangeError)
  })

  it('survives a trip through CSV and the loader', () => {
    const rows = generateSample(5)
    const parsed = parseCsv(rowsToCsv(rows))
    const loaded = buildRows(parsed, guessMapping(parsed.headers))
    expect(loaded.rows).toEqual(rows)
    expect(loaded.warnings).toEqual([])
  })
})

describe('createRandom', () => {
  it('returns values in [0, 1) and repeats for a seed', () => {
    const a = createRandom(5)
    const b = createRandom(5)
    for (let i = 0; i < 100; i += 1) {
      const value = a()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(value).toBe(b())
    }
  })
})
