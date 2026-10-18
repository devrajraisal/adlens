import { niceCeil } from '../lib/scale'

export interface BarItem {
  label: string
  value: number
}

interface Props {
  title: string
  items: BarItem[]
  format: (value: number) => string
  /** Draws a dashed line, for example break-even ROAS at 1. */
  reference?: number
}

const W = 720
const LABEL = 210
const ROW = 34

export default function BarChart({ title, items, format, reference }: Props) {
  const max = niceCeil(Math.max(...items.map((item) => item.value), reference ?? 0))
  const height = items.length * ROW + 12
  const scale = (value: number): number => ((W - LABEL - 80) * value) / max
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${title}: ${items.map((i) => `${i.label} ${format(i.value)}`).join(', ')}`}>
        {items.map((item, index) => (
          <g key={item.label} transform={`translate(0 ${index * ROW + 6})`}>
            <text x={LABEL - 10} y={ROW / 2 + 1} textAnchor="end" className="axis label">
              {item.label.length > 30 ? `${item.label.slice(0, 29)}…` : item.label}
              <title>{item.label}</title>
            </text>
            <rect x={LABEL} y={5} width={Math.max(scale(item.value), 0)} height={ROW - 12} rx={4} className="bar" />
            <text x={LABEL + scale(item.value) + 8} y={ROW / 2 + 1} className="axis value">{format(item.value)}</text>
          </g>
        ))}
        {reference !== undefined && (
          <line x1={LABEL + scale(reference)} x2={LABEL + scale(reference)} y1={0} y2={height} className="reference">
            <title>{`Break-even: ${format(reference)}`}</title>
          </line>
        )}
      </svg>
    </figure>
  )
}
