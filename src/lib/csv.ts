import Papa from 'papaparse'
import { parseDate } from './dates'
import {
  ALL_FIELDS,
  DataError,
  REQUIRED_FIELDS,
  type ColumnMapping,
  type Field,
  type RequiredField,
  type Row,
} from '../types'

export const MAX_FILE_BYTES = 20 * 1024 * 1024

// Header names are matched without caring about case. These are common names used by ad
// platform exports. Any other header can be mapped by hand in the app.
export const ALIASES: Record<Field, readonly string[]> = {
  date: ['date', 'day', 'reporting starts'],
  campaign: ['campaign', 'campaign name', 'campaign_name'],
  adSet: ['ad_set', 'ad set', 'ad set name', 'adset', 'adset_name'],
  impressions: ['impressions'],
  reach: ['reach'],
  clicks: ['clicks', 'link clicks', 'link_clicks', 'clicks (all)'],
  spend: ['spend', 'amount spent', 'amount spent (usd)', 'cost'],
  conversions: ['conversions', 'results', 'purchases', 'leads'],
  revenue: ['revenue', 'purchase conversion value', 'conversion value'],
}

export interface ParsedCsv {
  headers: string[]
  records: string[][]
}

export interface LoadResult {
  rows: Row[]
  warnings: string[]
}

const normalize = (header: string): string => header.trim().toLowerCase().replace(/\s+/g, ' ')

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' })
  if (result.errors.some((error) => error.type === 'Quotes')) {
    throw new DataError('The file has a broken quoted value. Check the export and try again.')
  }
  const [headerRow, ...records] = result.data
  if (!headerRow) throw new DataError('The file is empty.')
  if (records.length === 0) throw new DataError('The file has a header but no rows.')
  return { headers: headerRow.map((header) => header.trim()), records }
}

/** Best guess of which header belongs to which field. */
export function guessMapping(headers: string[]): ColumnMapping {
  const lookup = new Map<string, string>()
  for (const header of headers) {
    const key = normalize(header)
    if (!lookup.has(key)) lookup.set(key, header)
  }
  const mapping: ColumnMapping = {}
  for (const field of ALL_FIELDS) {
    for (const alias of ALIASES[field]) {
      const header = lookup.get(alias)
      if (header !== undefined) {
        mapping[field] = header
        break
      }
    }
  }
  return mapping
}

export function missingFields(mapping: ColumnMapping): RequiredField[] {
  return REQUIRED_FIELDS.filter((field) => !mapping[field])
}

/**
 * Turns text such as "$1,234.50", "Rs. 12,500", or "USD 12.50" into a number.
 * A currency label like "Rs." must be removed whole, so its dot is not read as a decimal point.
 */
export function parseNumber(value: string): number {
  const text = value.trim()
  if (/^-?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/.test(text)) return Number(text) // 1e5
  const cleaned = text
    .replace(/^[^\d.-]*[A-Za-z]\.?\s*/, '') // leading label: "Rs.", "USD "
    .replace(/[^0-9.-]/g, '') // symbols, thousands separators, trailing labels
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return Number.NaN
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : Number.NaN
}

export function buildRows(parsed: ParsedCsv, mapping: ColumnMapping): LoadResult {
  const missing = missingFields(mapping)
  if (missing.length > 0) {
    throw new DataError(`Missing required columns: ${missing.join(', ')}.`)
  }

  const index: Partial<Record<Field, number>> = {}
  for (const field of ALL_FIELDS) {
    const header = mapping[field]
    if (!header) continue
    const position = parsed.headers.indexOf(header)
    if (position === -1) throw new DataError(`Column "${header}" is not in the file.`)
    index[field] = position
  }

  const rows: Row[] = []
  let invalidDates = 0
  let blankNames = 0
  let unreadable = 0
  let tooManyClicks = 0

  for (const record of parsed.records) {
    const cell = (field: Field): string => {
      const position = index[field]
      return position === undefined ? '' : (record[position] ?? '')
    }

    const date = parseDate(cell('date'))
    if (date === null) {
      invalidDates += 1
      continue
    }
    const campaign = cell('campaign').trim()
    if (campaign === '') {
      blankNames += 1
      continue
    }
    const impressions = parseNumber(cell('impressions'))
    const clicks = parseNumber(cell('clicks'))
    const spend = parseNumber(cell('spend'))
    if (Number.isNaN(impressions) || Number.isNaN(clicks) || Number.isNaN(spend)) {
      unreadable += 1
      continue
    }
    const optional = (field: Field): number => {
      const value = parseNumber(cell(field))
      return Number.isNaN(value) ? 0 : value
    }
    const row: Row = {
      date,
      campaign,
      adSet: cell('adSet').trim() || '(none)',
      impressions,
      reach: optional('reach'),
      clicks,
      spend,
      conversions: optional('conversions'),
      revenue: optional('revenue'),
    }
    if (
      row.impressions < 0 || row.clicks < 0 || row.spend < 0 ||
      row.reach < 0 || row.conversions < 0 || row.revenue < 0
    ) {
      throw new DataError('The file contains negative numbers. Check the export settings.')
    }
    if (row.clicks > row.impressions) tooManyClicks += 1
    rows.push(row)
  }

  const warnings: string[] = []
  if (invalidDates) {
    warnings.push(
      `Skipped ${invalidDates} row(s) with a missing or invalid date. Use the format YYYY-MM-DD.`,
    )
  }
  if (blankNames) warnings.push(`Skipped ${blankNames} row(s) with no campaign name.`)
  if (unreadable) warnings.push(`Skipped ${unreadable} row(s) with unreadable numbers.`)
  if (tooManyClicks) warnings.push(`${tooManyClicks} row(s) have more clicks than impressions.`)

  if (rows.length === 0) throw new DataError('No usable rows were found after cleaning the data.')
  return { rows, warnings }
}
