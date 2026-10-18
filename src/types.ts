export const REQUIRED_FIELDS = ['date', 'campaign', 'impressions', 'clicks', 'spend'] as const
export const OPTIONAL_FIELDS = ['adSet', 'reach', 'conversions', 'revenue'] as const
export const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const

export type RequiredField = (typeof REQUIRED_FIELDS)[number]
export type Field = (typeof ALL_FIELDS)[number]
/** Maps each field to the header name used in the uploaded file. */
export type ColumnMapping = Partial<Record<Field, string>>

export const FIELD_LABELS: Record<Field, string> = {
  date: 'Date',
  campaign: 'Campaign',
  adSet: 'Ad set',
  impressions: 'Impressions',
  reach: 'Reach',
  clicks: 'Clicks',
  spend: 'Spend',
  conversions: 'Conversions / results',
  revenue: 'Revenue',
}

export interface Row {
  date: string // YYYY-MM-DD
  campaign: string
  adSet: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
}

export interface Totals {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
}

/** Every rate is null when its denominator is zero, never NaN or Infinity. */
export interface Rates {
  ctr: number | null
  cpc: number | null
  cpm: number | null
  convRate: number | null
  cpa: number | null
  roas: number | null
}

export interface Summary extends Totals, Rates {
  start: string
  end: string
  days: number
  campaigns: number
  hasConversions: boolean
  hasRevenue: boolean
}

export interface CampaignStats extends Totals, Rates {
  campaign: string
  spendShare: number
}

export interface DailyStats extends Totals, Rates {
  date: string
}

export type Severity = 'warning' | 'good' | 'info'

export interface Insight {
  kind: 'leader' | 'laggard' | 'waste' | 'trend' | 'frequency' | 'info'
  severity: Severity
  title: string
  detail: string
}

export interface Thresholds {
  /** Smallest share of total spend (0 to 1) that a campaign needs to be judged. */
  minSpendShare: number
  /** Week on week change (0 to 1) that counts as a trend. */
  trendChange: number
  /** Average daily frequency above which ad fatigue is flagged. */
  frequencyLimit: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minSpendShare: 0.05,
  trendChange: 0.15,
  frequencyLimit: 3,
}

/** The file cannot be analyzed. The message explains what to fix. */
export class DataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataError'
  }
}
