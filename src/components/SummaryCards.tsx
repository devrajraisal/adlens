import { money, multiple, percent, whole } from '../lib/format'
import type { Summary } from '../types'

export default function SummaryCards({ summary, currency }: { summary: Summary; currency: string }) {
  const cards: [string, string][] = [
    ['Spend', money(summary.spend, currency)],
    ['Impressions', whole(summary.impressions)],
    ['Clicks', whole(summary.clicks)],
    ['CTR', percent(summary.ctr)],
    ['CPC', money(summary.cpc, currency)],
    ['CPM', money(summary.cpm, currency)],
  ]
  if (summary.hasConversions) {
    cards.push(
      ['Conversions', whole(summary.conversions)],
      ['Cost per result', money(summary.cpa, currency)],
      ['Conversion rate', percent(summary.convRate)],
    )
  }
  if (summary.hasRevenue) cards.push(['Revenue', money(summary.revenue, currency)], ['ROAS', multiple(summary.roas)])

  return (
    <section aria-label="Summary" className="cards">
      {cards.map(([label, value]) => (
        <div className="card" key={label}>
          <span className="card-label">{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  )
}
