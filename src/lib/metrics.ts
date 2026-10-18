import type { CampaignStats, DailyStats, Rates, Row, Summary, Totals } from '../types'

export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator
}

const EMPTY: Totals = { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }

export function addTotals(total: Totals, row: Totals): Totals {
  return {
    impressions: total.impressions + row.impressions,
    clicks: total.clicks + row.clicks,
    spend: total.spend + row.spend,
    conversions: total.conversions + row.conversions,
    revenue: total.revenue + row.revenue,
  }
}

export function totalsOf(rows: readonly Row[]): Totals {
  return rows.reduce<Totals>(addTotals, EMPTY)
}

export function ratesOf(totals: Totals): Rates {
  return {
    ctr: ratio(totals.clicks, totals.impressions),
    cpc: ratio(totals.spend, totals.clicks),
    cpm: totals.impressions === 0 ? null : (totals.spend / totals.impressions) * 1000,
    convRate: ratio(totals.conversions, totals.clicks),
    cpa: ratio(totals.spend, totals.conversions),
    roas: ratio(totals.revenue, totals.spend),
  }
}

export function summarize(rows: readonly Row[]): Summary {
  const totals = totalsOf(rows)
  const dates = rows.map((row) => row.date).sort()
  const rates = ratesOf(totals)
  return {
    ...totals,
    ...rates,
    // Without any revenue there is no ROAS to report, so 0 would be misleading.
    roas: totals.revenue > 0 ? rates.roas : null,
    start: dates[0] ?? '',
    end: dates[dates.length - 1] ?? '',
    days: new Set(dates).size,
    campaigns: new Set(rows.map((row) => row.campaign)).size,
    hasConversions: totals.conversions > 0,
    hasRevenue: totals.revenue > 0,
  }
}

function groupBy(rows: readonly Row[], key: (row: Row) => string): Map<string, Totals> {
  const groups = new Map<string, Totals>()
  for (const row of rows) {
    const name = key(row)
    groups.set(name, addTotals(groups.get(name) ?? EMPTY, row))
  }
  return groups
}

export function byCampaign(rows: readonly Row[]): CampaignStats[] {
  const groups = groupBy(rows, (row) => row.campaign)
  const totalSpend = totalsOf(rows).spend
  return [...groups.entries()]
    .map(([campaign, totals]) => ({
      campaign,
      ...totals,
      ...ratesOf(totals),
      spendShare: totalSpend === 0 ? 0 : totals.spend / totalSpend,
    }))
    .sort((a, b) => b.spend - a.spend || a.campaign.localeCompare(b.campaign))
}

export function byDay(rows: readonly Row[]): DailyStats[] {
  const groups = groupBy(rows, (row) => row.date)
  return [...groups.entries()]
    .map(([date, totals]) => ({ date, ...totals, ...ratesOf(totals) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
