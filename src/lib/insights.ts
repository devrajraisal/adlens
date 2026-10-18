import { toDayNumber } from './dates'
import { money, multiple, percent } from './format'
import { byCampaign, ratio, totalsOf } from './metrics'
import {
  DEFAULT_THRESHOLDS,
  type CampaignStats,
  type Insight,
  type Row,
  type Thresholds,
} from '../types'

const SEVERITY_ORDER: Record<Insight['severity'], number> = { warning: 0, good: 1, info: 2 }

function leaders(campaigns: CampaignStats[], minShare: number, currency: string): Insight[] {
  const pool = campaigns.filter((campaign) => campaign.spendShare >= minShare)
  if (pool.length < 2) return []

  const hasRevenue = pool.some((campaign) => campaign.revenue > 0)
  if (hasRevenue) {
    const ranked = [...pool].sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1))
    const best = ranked[0]
    const worst = ranked[ranked.length - 1]
    if (!best || !worst) return []
    return [
      {
        kind: 'leader',
        severity: 'good',
        title: `Best return: ${best.campaign}`,
        detail: `ROAS of ${multiple(best.roas)} on ${money(best.spend, currency)} spend.`,
      },
      {
        kind: 'laggard',
        severity: 'warning',
        title: `Weakest return: ${worst.campaign}`,
        detail: `ROAS of ${multiple(worst.roas)} on ${money(worst.spend, currency)} spend.`,
      },
    ]
  }

  const withResults = pool
    .filter((campaign) => campaign.conversions > 0 && campaign.cpa !== null)
    .sort((a, b) => (a.cpa ?? 0) - (b.cpa ?? 0))
  const best = withResults[0]
  const worst = withResults[withResults.length - 1]
  if (withResults.length < 2 || !best || !worst) return []
  return [
    {
      kind: 'leader',
      severity: 'good',
      title: `Cheapest results: ${best.campaign}`,
      detail: `Cost per result of ${money(best.cpa, currency)}.`,
    },
    {
      kind: 'laggard',
      severity: 'warning',
      title: `Most expensive results: ${worst.campaign}`,
      detail: `Cost per result of ${money(worst.cpa, currency)}.`,
    },
  ]
}

function wastedSpend(campaigns: CampaignStats[], minShare: number, currency: string): Insight[] {
  // Only meaningful when the file tracks conversions at all.
  if (!campaigns.some((campaign) => campaign.conversions > 0)) return []
  return campaigns
    .filter((campaign) => campaign.spendShare >= minShare && campaign.conversions === 0)
    .map((campaign) => ({
      kind: 'waste' as const,
      severity: 'warning' as const,
      title: `No conversions: ${campaign.campaign}`,
      detail:
        `Spent ${money(campaign.spend, currency)} (${percent(campaign.spendShare, 1)} of the ` +
        'budget) with no conversions. Review the audience, the creative, or the goal.',
    }))
}

function trend(rows: readonly Row[], changeLimit: number): Insight[] {
  const days = [...new Set(rows.map((row) => toDayNumber(row.date)))]
  if (days.length < 14) return []
  const lastDay = Math.max(...days)
  const recent = rows.filter((row) => toDayNumber(row.date) > lastDay - 7)
  const previous = rows.filter((row) => {
    const day = toDayNumber(row.date)
    return day <= lastDay - 7 && day > lastDay - 14
  })
  if (previous.length === 0) return []

  const useCpa = totalsOf(rows).conversions > 0
  const label = useCpa ? 'cost per result' : 'click-through rate'
  const value = (part: readonly Row[]): number | null => {
    const totals = totalsOf(part)
    return useCpa ? ratio(totals.spend, totals.conversions) : ratio(totals.clicks, totals.impressions)
  }
  const now = value(recent)
  const before = value(previous)
  // A zero baseline gives no meaningful percentage, so there is nothing to compare against.
  if (now === null || before === null || before === 0) return []

  const change = (now - before) / before
  if (Math.abs(change) < changeLimit) return []
  // For cost, lower is better. For click-through rate, higher is better.
  const worse = useCpa ? change > 0 : change < 0
  return [
    {
      kind: 'trend',
      severity: worse ? 'warning' : 'good',
      title: `Account ${label} is ${change > 0 ? 'up' : 'down'} ${Math.round(Math.abs(change) * 100)}% week on week`,
      detail: 'Compared with the previous 7 days.',
    },
  ]
}

function frequency(rows: readonly Row[], limit: number): Insight[] {
  const days = rows.map((row) => toDayNumber(row.date))
  if (days.length === 0) return []
  const lastDay = days.reduce((a, b) => Math.max(a, b))
  const totals = new Map<string, { impressions: number; reach: number }>()
  for (const row of rows) {
    if (toDayNumber(row.date) <= lastDay - 7 || row.reach <= 0) continue
    const current = totals.get(row.campaign) ?? { impressions: 0, reach: 0 }
    totals.set(row.campaign, {
      impressions: current.impressions + row.impressions,
      reach: current.reach + row.reach,
    })
  }
  return [...totals.entries()]
    .filter(([, value]) => value.impressions / value.reach > limit)
    .map(([campaign, value]) => ({
      kind: 'frequency' as const,
      severity: 'warning' as const,
      title: `High ad frequency: ${campaign}`,
      detail:
        `People saw these ads about ${(value.impressions / value.reach).toFixed(1)} times per day ` +
        'on average in the last 7 days. Refresh the creative or widen the audience to avoid ad fatigue.',
    }))
}

export function generateInsights(
  rows: readonly Row[],
  currency = 'USD',
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Insight[] {
  if (rows.length === 0) return []
  const campaigns = byCampaign(rows)
  const insights = [
    ...leaders(campaigns, thresholds.minSpendShare, currency),
    ...wastedSpend(campaigns, thresholds.minSpendShare, currency),
    ...trend(rows, thresholds.trendChange),
    ...frequency(rows, thresholds.frequencyLimit),
  ]
  if (insights.length === 0) {
    insights.push({
      kind: 'info',
      severity: 'info',
      title: 'No issues found',
      detail: 'None of the checks found a problem in this data.',
    })
  }
  // Array.prototype.sort is stable, so insights of equal severity keep their order.
  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
