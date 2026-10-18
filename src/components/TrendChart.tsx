import { money, whole } from '../lib/format'
import { labelIndexes, niceCeil, ticks } from '../lib/scale'
import type { DailyStats } from '../types'

interface Props {
  data: DailyStats[]
  currency: string
}

const W = 720
const H = 270
const M = { left: 58, right: 58, top: 16, bottom: 34 }

export default function TrendChart({ data, currency }: Props) {
  const useConversions = data.some((day) => day.conversions > 0)
  const secondaryLabel = useConversions ? 'Conversions' : 'Clicks'
  const secondary = (day: DailyStats): number => (useConversions ? day.conversions : day.clicks)

  const spendMax = niceCeil(Math.max(...data.map((day) => day.spend), 0))
  const secondMax = niceCeil(Math.max(...data.map(secondary), 0))
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom
  const x = (index: number): number => M.left + (data.length === 1 ? innerW / 2 : (index / (data.length - 1)) * innerW)
  const yFor = (value: number, max: number): number => M.top + innerH - (value / max) * innerH
  const path = (pick: (day: DailyStats) => number, max: number): string =>
    data.map((day, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${yFor(pick(day), max).toFixed(1)}`).join(' ')

  return (
    <figure className="chart">
      <figcaption>Daily spend and {secondaryLabel.toLowerCase()}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart of daily spend and ${secondaryLabel.toLowerCase()} over ${data.length} days`}>
        {ticks(spendMax).map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={W - M.right} y1={yFor(tick, spendMax)} y2={yFor(tick, spendMax)} className="grid" />
            <text x={M.left - 8} y={yFor(tick, spendMax) + 4} textAnchor="end" className="axis spend">{whole(tick)}</text>
          </g>
        ))}
        {ticks(secondMax).map((tick) => (
          <text key={tick} x={W - M.right + 8} y={yFor(tick, secondMax) + 4} className="axis second">{whole(tick)}</text>
        ))}
        {labelIndexes(data.length).map((index) => (
          <text key={index} x={x(index)} y={H - 10} textAnchor="middle" className="axis">{data[index]?.date.slice(5)}</text>
        ))}
        <path d={path((day) => day.spend, spendMax)} className="line spend" />
        <path d={path(secondary, secondMax)} className="line second" />
        {data.map((day, index) => (
          <g key={day.date}>
            <circle cx={x(index)} cy={yFor(day.spend, spendMax)} r={3} className="dot spend">
              <title>{`${day.date}: spend ${money(day.spend, currency)}`}</title>
            </circle>
            <circle cx={x(index)} cy={yFor(secondary(day), secondMax)} r={3} className="dot second">
              <title>{`${day.date}: ${secondaryLabel.toLowerCase()} ${whole(secondary(day))}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <div className="legend">
        <span><i className="swatch spend" /> Spend ({currency})</span>
        <span><i className="swatch second" /> {secondaryLabel}</span>
      </div>
    </figure>
  )
}
