import { describe, expect, it } from 'vitest'
import { buildRows, guessMapping, missingFields, parseCsv, parseNumber } from './csv'
import { DataError } from '../types'

const csv = (rows: string[], header = 'date,campaign,impressions,clicks,spend') =>
  [header, ...rows].join('\n')

const load = (text: string, mapping?: Parameters<typeof buildRows>[1]) => {
  const parsed = parseCsv(text)
  return buildRows(parsed, mapping ?? guessMapping(parsed.headers))
}

describe('parseCsv', () => {
  it('handles a BOM, quoted commas, and blank lines', () => {
    const parsed = parseCsv('\uFEFFdate,campaign\n\n2026-10-01,"Sale, Spring"\n')
    expect(parsed.headers).toEqual(['date', 'campaign'])
    expect(parsed.records).toEqual([['2026-10-01', 'Sale, Spring']])
  })
  it('rejects empty files and files with only a header', () => {
    expect(() => parseCsv('')).toThrow('The file is empty.')
    expect(() => parseCsv('date,campaign\n')).toThrow('no rows')
  })
  it('rejects a broken quoted value', () => {
    expect(() => parseCsv('a,b\n"unfinished,1\n')).toThrow(DataError)
  })
})

describe('guessMapping', () => {
  it('recognizes common export headers in any case', () => {
    const mapping = guessMapping([
      'Day', 'Campaign name', 'Ad set name', 'IMPRESSIONS', 'Link clicks', 'Amount spent (USD)', 'Results',
    ])
    expect(mapping).toMatchObject({
      date: 'Day', campaign: 'Campaign name', adSet: 'Ad set name', impressions: 'IMPRESSIONS',
      clicks: 'Link clicks', spend: 'Amount spent (USD)', conversions: 'Results',
    })
    expect(missingFields(mapping)).toEqual([])
  })
  it('lists the required fields it cannot find', () => {
    expect(missingFields(guessMapping(['date', 'campaign', 'clicks']))).toEqual(['impressions', 'spend'])
  })
})

describe('parseNumber', () => {
  it.each([
    ['$1,234.50', 1234.5],
    ['Rs. 12,500', 12500],
    ['Rs.12,500', 12500],
    ['PKR1,000', 1000],
    ['USD 12.50', 12.5],
    ['1,234.50 PKR', 1234.5],
    ['.5', 0.5],
    ['-3', -3],
    ['1e5', 100000],
    ['  42  ', 42],
  ])('reads %j as %d', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it.each(['', 'abc', '-', '.', '1.2.3', 'Rs.', 'N/A'])('returns NaN for %j', (text) => {
    expect(parseNumber(text)).toBeNaN()
  })
})

describe('buildRows', () => {
  it('reads the minimum columns and fills the optional ones', () => {
    const { rows, warnings } = load(csv(['2026-10-01,Spring Sale,1000,25,12.5']))
    expect(rows).toEqual([
      { date: '2026-10-01', campaign: 'Spring Sale', adSet: '(none)', impressions: 1000, reach: 0,
        clicks: 25, spend: 12.5, conversions: 0, revenue: 0 },
    ])
    expect(warnings).toEqual([])
  })

  it('cleans formatted numbers', () => {
    const { rows } = load(csv(['2026-10-01,A,"12,500",300,"$1,234.50"']))
    expect(rows[0]).toMatchObject({ impressions: 12500, clicks: 300, spend: 1234.5 })
  })

  it('skips unusable rows and says how many', () => {
    const { rows, warnings } = load(csv([
      '2026-10-01,A,100,5,1',
      'not a date,A,100,5,1',
      '2026-10-02,,100,5,1',
      '2026-10-03,A,abc,5,1',
    ]))
    expect(rows).toHaveLength(1)
    expect(warnings).toHaveLength(3)
    expect(warnings.join(' ')).toContain('YYYY-MM-DD')
  })

  it('uses a manual mapping over the guess', () => {
    const parsed = parseCsv('date,campaign,impressions,clicks,Kharcha\n2026-10-01,A,1000,20,300')
    const { rows } = buildRows(parsed, { ...guessMapping(parsed.headers), spend: 'Kharcha' })
    expect(rows[0]?.spend).toBe(300)
  })

  it('reports a mapping that points to a missing header', () => {
    const parsed = parseCsv(csv(['2026-10-01,A,100,5,1']))
    expect(() => buildRows(parsed, { ...guessMapping(parsed.headers), spend: 'Nope' })).toThrow('"Nope" is not in the file')
  })

  it('rejects negative numbers and files with no usable rows', () => {
    expect(() => load(csv(['2026-10-01,A,100,5,-3']))).toThrow('negative')
    expect(() => load(csv(['nope,A,1,1,1']))).toThrow('No usable rows')
  })

  it('warns when clicks exceed impressions', () => {
    expect(load(csv(['2026-10-01,A,10,50,1'])).warnings.join(' ')).toContain('more clicks than impressions')
  })

  it('throws when required fields are not mapped', () => {
    const parsed = parseCsv('a,b\n1,2')
    expect(() => buildRows(parsed, {})).toThrow('Missing required columns: date, campaign')
  })
})
