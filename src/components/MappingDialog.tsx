import { useState } from 'react'
import { ALL_FIELDS, FIELD_LABELS, REQUIRED_FIELDS, type ColumnMapping, type Field } from '../types'

interface Props {
  headers: string[]
  initial: ColumnMapping
  error: string
  onApply: (mapping: ColumnMapping) => void
  onCancel: () => void
}

const isRequired = (field: Field): boolean => (REQUIRED_FIELDS as readonly string[]).includes(field)

export default function MappingDialog({ headers, initial, error, onApply, onCancel }: Props) {
  const [mapping, setMapping] = useState<ColumnMapping>(initial)
  const ready = REQUIRED_FIELDS.every((field) => Boolean(mapping[field]))

  const choose = (field: Field, header: string) =>
    setMapping((current) => {
      const next = { ...current }
      if (header === '') delete next[field]
      else next[field] = header
      return next
    })

  return (
    <div className="overlay" onKeyDown={(event) => event.key === 'Escape' && onCancel()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapping-title"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) onApply(mapping)
        }}
      >
        <h2 id="mapping-title">Match your columns</h2>
        <p className="muted">Some required columns were not recognised. Choose which column in your file holds each value.</p>
        {ALL_FIELDS.map((field) => (
          <label className="field row" key={field}>
            <span>{FIELD_LABELS[field]}{isRequired(field) ? ' *' : ''}</span>
            <select className="input" value={mapping[field] ?? ''} onChange={(event) => choose(field, event.target.value)}>
              <option value="">{isRequired(field) ? 'Choose a column...' : '(not in my file)'}</option>
              {headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
        ))}
        <p className="error" role="alert">{error}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn" disabled={!ready}>Use these columns</button>
        </div>
      </form>
    </div>
  )
}
