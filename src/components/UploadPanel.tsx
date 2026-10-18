import { useId, useState } from 'react'

interface Props {
  error: string
  onFile: (file: File) => void
  onSample: () => void
}

export default function UploadPanel({ error, onFile, onSample }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  return (
    <section className="upload" aria-labelledby="upload-title">
      <h1 id="upload-title">See what your ad data is really telling you</h1>
      <p className="muted">
        Drop a campaign CSV and get KPIs, plain language insights, and charts in seconds.
      </p>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) onFile(file)
        }}
      >
        <label htmlFor={inputId} className="btn">Choose a CSV file</label>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
            event.target.value = '' // lets the same file be chosen again
          }}
        />
        <span className="muted">or drop it here</span>
      </div>
      <p className="error" role="alert">{error}</p>
      <button type="button" className="btn btn-ghost" onClick={onSample}>Try it with sample data</button>
      <p className="privacy">
        🔒 <strong>Private by design.</strong> Your file is read in this browser tab and is never uploaded.
        The page is also blocked from making any network request.
      </p>
      <p className="muted small">
        Needs <code>date</code>, <code>campaign</code>, <code>impressions</code>, <code>clicks</code>, and <code>spend</code>.
        Optional: <code>ad_set</code>, <code>reach</code>, <code>conversions</code>, <code>revenue</code>. Dates as YYYY-MM-DD.
      </p>
    </section>
  )
}
