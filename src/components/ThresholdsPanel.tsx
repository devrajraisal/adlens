import { DEFAULT_THRESHOLDS, type Thresholds } from '../types'

interface Props {
  thresholds: Thresholds
  onChange: (next: Thresholds) => void
}

function NumberField(props: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => {
          const next = event.target.valueAsNumber
          if (Number.isFinite(next)) props.onChange(Math.min(props.max, Math.max(props.min, next)))
        }}
      />
      <small>{props.hint}</small>
    </label>
  )
}

export default function ThresholdsPanel({ thresholds, onChange }: Props) {
  return (
    <details className="panel thresholds">
      <summary>Adjust the rules</summary>
      <div className="fields">
        <NumberField
          label="Minimum share of spend (%)"
          hint="Smaller campaigns are not judged."
          value={Math.round(thresholds.minSpendShare * 100)}
          min={0} max={50} step={1}
          onChange={(value) => onChange({ ...thresholds, minSpendShare: value / 100 })}
        />
        <NumberField
          label="Trend change (%)"
          hint="Week on week change that is flagged."
          value={Math.round(thresholds.trendChange * 100)}
          min={1} max={100} step={1}
          onChange={(value) => onChange({ ...thresholds, trendChange: value / 100 })}
        />
        <NumberField
          label="Frequency limit"
          hint="Average daily views per person."
          value={thresholds.frequencyLimit}
          min={1} max={20} step={0.5}
          onChange={(value) => onChange({ ...thresholds, frequencyLimit: value })}
        />
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => onChange(DEFAULT_THRESHOLDS)}>
        Reset to defaults
      </button>
    </details>
  )
}
