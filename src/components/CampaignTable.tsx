import { useState } from 'react'
import { money, multiple, percent, whole } from '../lib/format'
import type { CampaignStats, Summary } from '../types'

type SortKey = 'campaign' | 'spend' | 'spendShare' | 'ctr' | 'cpc' | 'conversions' | 'cpa' | 'roas'

interface Column {
  key: SortKey
  label: string
  render: (campaign: CampaignStats, currency: string) => string
}

export default function CampaignTable({ campaigns, summary, currency }: { campaigns: CampaignStats[]; summary: Summary; currency: string }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'spend', direction: 'desc' })

  const columns: Column[] = [
    { key: 'campaign', label: 'Campaign', render: (c) => c.campaign },
    { key: 'spend', label: 'Spend', render: (c, cur) => money(c.spend, cur) },
    { key: 'spendShare', label: 'Share', render: (c) => percent(c.spendShare, 1) },
    { key: 'ctr', label: 'CTR', render: (c) => percent(c.ctr) },
    { key: 'cpc', label: 'CPC', render: (c, cur) => money(c.cpc, cur) },
  ]
  if (summary.hasConversions) {
    columns.push(
      { key: 'conversions', label: 'Results', render: (c) => whole(c.conversions) },
      { key: 'cpa', label: 'Cost/result', render: (c, cur) => money(c.cpa, cur) },
    )
  }
  if (summary.hasRevenue) columns.push({ key: 'roas', label: 'ROAS', render: (c) => multiple(c.roas) })

  const sorted = [...campaigns].sort((a, b) => {
    const left = a[sort.key]
    const right = b[sort.key]
    // Missing values (null) always go to the bottom, whichever way the table is sorted.
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1
    const order = typeof left === 'string' && typeof right === 'string' ? left.localeCompare(right) : Number(left) - Number(right)
    return sort.direction === 'asc' ? order : -order
  })

  const toggle = (key: SortKey) =>
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }))

  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">Campaign performance</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggle(column.key)}>
                  {column.label}
                  <span aria-hidden="true">{sort.key === column.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((campaign) => (
            <tr key={campaign.campaign}>
              {columns.map((column) => <td key={column.key}>{column.render(campaign, currency)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
