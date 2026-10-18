import { useMemo, useState } from 'react'
import BarChart from './components/BarChart'
import CampaignTable from './components/CampaignTable'
import InsightsList from './components/InsightsList'
import MappingDialog from './components/MappingDialog'
import SummaryCards from './components/SummaryCards'
import ThresholdsPanel from './components/ThresholdsPanel'
import TrendChart from './components/TrendChart'
import UploadPanel from './components/UploadPanel'
import { buildRows, guessMapping, missingFields, parseCsv, type ParsedCsv } from './lib/csv'
import { buildSummaryJson } from './lib/exportSummary'
import { generateInsights } from './lib/insights'
import { money, multiple, normalizeCurrency } from './lib/format'
import { byCampaign, byDay, summarize } from './lib/metrics'
import { readFileText } from './lib/readFile'
import { generateSample } from './lib/sample'
import { DEFAULT_THRESHOLDS, DataError, type ColumnMapping, type Row, type Thresholds } from './types'

interface Dataset {
  rows: Row[]
  warnings: string[]
  source: string
}

interface PendingMapping {
  parsed: ParsedCsv
  initial: ColumnMapping
  source: string
}

function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const messageOf = (error: unknown): string =>
  error instanceof DataError ? error.message : 'Something went wrong while reading the file.'

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingMapping | null>(null)
  const [mappingError, setMappingError] = useState('')
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS)
  const [currencyInput, setCurrencyInput] = useState('USD')
  const currency = normalizeCurrency(currencyInput)

  const analysis = useMemo(() => {
    if (!dataset) return null
    const campaigns = byCampaign(dataset.rows)
    return {
      summary: summarize(dataset.rows),
      campaigns,
      daily: byDay(dataset.rows),
      insights: generateInsights(dataset.rows, currency, thresholds),
    }
  }, [dataset, currency, thresholds])

  const loadText = (text: string, source: string) => {
    setError('')
    try {
      const parsed = parseCsv(text)
      const mapping = guessMapping(parsed.headers)
      if (missingFields(mapping).length > 0) {
        setMappingError('')
        setPending({ parsed, initial: mapping, source })
        return
      }
      const { rows, warnings } = buildRows(parsed, mapping)
      setDataset({ rows, warnings, source })
    } catch (caught) {
      setError(messageOf(caught))
    }
  }

  const handleFile = async (file: File) => {
    try {
      loadText(await readFileText(file), file.name)
    } catch (caught) {
      setError(messageOf(caught))
    }
  }

  const applyMapping = (mapping: ColumnMapping) => {
    if (!pending) return
    try {
      const { rows, warnings } = buildRows(pending.parsed, mapping)
      setDataset({ rows, warnings, source: pending.source })
      setPending(null)
    } catch (caught) {
      setMappingError(messageOf(caught))
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span aria-hidden="true">🔍</span> AdLens</div>
        <span className="badge">🔒 Runs in your browser</span>
      </header>

      <main className="content">
        {!dataset || !analysis ? (
          <UploadPanel
            error={error}
            onFile={handleFile}
            onSample={() => {
              setDataset({ rows: generateSample(), warnings: [], source: 'Synthetic sample data' })
              setError('')
            }}
          />
        ) : (
          <>
            <div className="toolbar">
              <div>
                <h1>Campaign overview</h1>
                <p className="muted">
                  {dataset.source} · {analysis.summary.start} to {analysis.summary.end} ({analysis.summary.days} days,{' '}
                  {analysis.summary.campaigns} campaigns)
                </p>
              </div>
              <div className="toolbar-actions">
                <label className="field inline">
                  <span>Currency</span>
                  <input
                    className="input narrow"
                    value={currencyInput}
                    maxLength={3}
                    onChange={(event) => setCurrencyInput(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => downloadText('adlens-summary.json', buildSummaryJson(analysis.summary, analysis.campaigns, analysis.insights, dataset.warnings))}
                >
                  Download JSON
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setDataset(null)}>Start over</button>
              </div>
            </div>

            {dataset.source === 'Synthetic sample data' && (
              <p className="notice">This is synthetic sample data made for the demo. It is not real campaign data.</p>
            )}

            <SummaryCards summary={analysis.summary} currency={currency} />

            <h2>Insights</h2>
            <InsightsList insights={analysis.insights} />
            <ThresholdsPanel thresholds={thresholds} onChange={setThresholds} />

            <h2>Trends</h2>
            <TrendChart data={analysis.daily} currency={currency} />

            <h2>Campaigns</h2>
            <CampaignTable campaigns={analysis.campaigns} summary={analysis.summary} currency={currency} />
            <BarChart
              title="Spend by campaign"
              items={analysis.campaigns.map((c) => ({ label: c.campaign, value: c.spend }))}
              format={(value) => money(value, currency)}
            />
            {analysis.summary.hasRevenue ? (
              <BarChart
                title="Return on ad spend (ROAS) by campaign"
                items={analysis.campaigns.map((c) => ({ label: c.campaign, value: c.roas ?? 0 }))}
                format={multiple}
                reference={1}
              />
            ) : analysis.summary.hasConversions ? (
              <BarChart
                title="Cost per result by campaign (lower is better)"
                items={analysis.campaigns.filter((c) => c.cpa !== null).map((c) => ({ label: c.campaign, value: c.cpa ?? 0 }))}
                format={(value) => money(value, currency)}
              />
            ) : null}

            {dataset.warnings.length > 0 && (
              <section className="notes" aria-label="Data notes">
                <h2>Data notes</h2>
                <ul>{dataset.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </section>
            )}
          </>
        )}
      </main>

      {pending && (
        <MappingDialog
          headers={pending.parsed.headers}
          initial={pending.initial}
          error={mappingError}
          onApply={applyMapping}
          onCancel={() => setPending(null)}
        />
      )}

      <footer className="footer">
        Insights come from simple rules, so treat them as prompts for a closer look, not as final answers.
      </footer>
    </div>
  )
}
