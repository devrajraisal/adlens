import type { Insight } from '../types'

const ICON = { warning: '⚠', good: '✓', info: 'ℹ' } as const
const WORD = { warning: 'Warning', good: 'Good news', info: 'Note' } as const

export default function InsightsList({ insights }: { insights: Insight[] }) {
  return (
    <ul className="insights" aria-label="Insights">
      {insights.map((insight) => (
        <li key={insight.title} className={`insight ${insight.severity}`}>
          <span aria-hidden="true" className="insight-icon">{ICON[insight.severity]}</span>
          <div>
            <strong><span className="visually-hidden">{WORD[insight.severity]}: </span>{insight.title}</strong>
            <p>{insight.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
