import { addDays } from './dates'
import type { Row } from '../types'

/** Small seeded random generator (mulberry32), so the sample is the same every time. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function binomial(trials: number, probability: number, random: () => number): number {
  let successes = 0
  for (let i = 0; i < trials; i += 1) if (random() < probability) successes += 1
  return successes
}

interface CampaignPlan {
  name: string
  dailyBudget: number
  cpm: number
  clickRate: number
  conversionRate: number
  orderValue: number
}

const CAMPAIGNS: CampaignPlan[] = [
  { name: 'Retargeting - Cart Abandoners', dailyBudget: 40, cpm: 6, clickRate: 0.022, conversionRate: 0.06, orderValue: 38 },
  { name: 'Lookalike 1% - Purchasers', dailyBudget: 90, cpm: 11, clickRate: 0.012, conversionRate: 0.025, orderValue: 42 },
  { name: 'Broad - Video Views', dailyBudget: 70, cpm: 3.5, clickRate: 0.004, conversionRate: 0, orderValue: 0 },
  { name: 'Interest - Streetwear', dailyBudget: 60, cpm: 9, clickRate: 0.01, conversionRate: 0.012, orderValue: 40 },
  { name: 'Brand Awareness', dailyBudget: 30, cpm: 4.5, clickRate: 0.006, conversionRate: 0.003, orderValue: 35 },
]
const AD_SETS = ['Audience A', 'Audience B']
const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Synthetic data for demos and tests. It is NOT real campaign data. It is built to contain
 * realistic problems: no conversions on one campaign, ad fatigue on another, and a drop
 * in results during the last week.
 */
export function generateSample(days = 60, seed = 42, start = '2026-08-01'): Row[] {
  if (!Number.isInteger(days) || days < 1) throw new RangeError('days must be a whole number of at least 1')
  const random = createRandom(seed)
  const rows: Row[] = []
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const date = addDays(start, dayIndex)
    const progress = dayIndex / Math.max(days - 1, 1)
    for (const plan of CAMPAIGNS) {
      let clickFactor = 1
      let conversionFactor = 1
      let frequency = 1.3
      if (plan.name.startsWith('Retargeting')) {
        // The small retargeting audience sees the same ads more and more often,
        // and in the last week results fall because of ad fatigue.
        frequency = 1.4 + 2.8 * progress
        if (dayIndex >= days - 7) {
          clickFactor = 0.85
          conversionFactor = 0.6
        }
      }
      for (const adSet of AD_SETS) {
        const spend = (plan.dailyBudget / 2) * (0.9 + random() * 0.2)
        const impressions = Math.floor((spend / plan.cpm) * 1000)
        const clicks = binomial(impressions, plan.clickRate * clickFactor, random)
        const conversions = binomial(clicks, plan.conversionRate * conversionFactor, random)
        rows.push({
          date,
          campaign: plan.name,
          adSet,
          impressions,
          reach: Math.floor(impressions / frequency),
          clicks,
          spend: round2(spend),
          conversions,
          revenue: round2(conversions * plan.orderValue * (0.9 + random() * 0.2)),
        })
      }
    }
  }
  return rows
}

export function rowsToCsv(rows: readonly Row[]): string {
  const header = 'date,campaign,ad_set,impressions,reach,clicks,spend,conversions,revenue'
  const lines = rows.map((r) =>
    [r.date, r.campaign, r.adSet, r.impressions, r.reach, r.clicks, r.spend, r.conversions, r.revenue].join(','),
  )
  return [header, ...lines].join('\n')
}
