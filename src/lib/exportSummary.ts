import type { CampaignStats, Insight, Summary } from '../types'

/** JSON text of the analysis. Missing rates stay null, and the output never contains NaN. */
export function buildSummaryJson(
  summary: Summary,
  campaigns: readonly CampaignStats[],
  insights: readonly Insight[],
  warnings: readonly string[],
): string {
  return JSON.stringify({ summary, campaigns, insights, warnings }, null, 2)
}
