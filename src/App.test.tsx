// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

const csvFile = (text: string, name = 'export.csv') => new File([text], name, { type: 'text/csv' })
const GOOD_CSV = [
  'date,campaign,impressions,clicks,spend',
  '2026-10-01,Spring Sale,10000,200,100',
  '2026-10-02,Summer Sale,5000,50,60',
].join('\n')

async function openSample() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Try it with sample data' }))
  return user
}

async function upload(text: string, name?: string) {
  const user = userEvent.setup()
  render(<App />)
  await user.upload(screen.getByLabelText('Choose a CSV file'), csvFile(text, name))
  return user
}

describe('upload screen', () => {
  it('explains what to do and that nothing is uploaded', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /what your ad data is really telling you/ })).toBeTruthy()
    expect(screen.getByText(/never uploaded/)).toBeTruthy()
  })

  it('shows a clear error for an empty file', async () => {
    await upload('', 'empty.csv')
    expect((await screen.findByRole('alert')).textContent).toBe('The file is empty.')
  })

  it('shows a clear error when no row can be used', async () => {
    await upload('date,campaign,impressions,clicks,spend\nnot a date,A,1,1,1')
    expect((await screen.findByRole('alert')).textContent).toContain('No usable rows')
  })
})

describe('sample data', () => {
  it('shows the overview, the demo notice, and the designed findings', async () => {
    await openSample()
    expect(screen.getByRole('heading', { name: 'Campaign overview' })).toBeTruthy()
    expect(screen.getByText(/synthetic sample data made for the demo/)).toBeTruthy()
    const insights = within(screen.getByLabelText('Insights'))
    expect(insights.getByText(/No conversions: Broad - Video Views/)).toBeTruthy()
    expect(insights.getByText(/Best return: Retargeting - Cart Abandoners/)).toBeTruthy()
    expect(insights.getByText(/cost per result is up/)).toBeTruthy()
  })

  it('lists every campaign and draws the charts with accessible labels', async () => {
    await openSample()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(6) // header and 5 campaigns
    expect(screen.getByRole('img', { name: /Line chart of daily spend and conversions over 60 days/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Spend by campaign/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Return on ad spend/ })).toBeTruthy()
  })

  it('goes back to the upload screen with Start over', async () => {
    const user = await openSample()
    await user.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByRole('button', { name: 'Try it with sample data' })).toBeTruthy()
  })
})

describe('uploading a file', () => {
  it('analyzes a valid file and shows the file name and totals', async () => {
    await upload(GOOD_CSV, 'march.csv')
    expect(await screen.findByText(/march\.csv/)).toBeTruthy()
    const summary = within(screen.getByLabelText('Summary'))
    expect(summary.getByText('160.00 USD')).toBeTruthy() // spend 100 + 60
    expect(summary.getByText('15,000')).toBeTruthy() // impressions
    expect(screen.getByRole('cell', { name: 'Spring Sale' })).toBeTruthy()
  })

  it('hides conversion columns and charts when the file has no conversions', async () => {
    await upload(GOOD_CSV)
    await screen.findByRole('table')
    expect(screen.queryByText('ROAS')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /Cost\/result/ })).toBeNull()
  })

  it('shows data notes for skipped rows', async () => {
    await upload(`${GOOD_CSV}\nnot a date,Bad,1,1,1`)
    const notes = await screen.findByLabelText('Data notes')
    expect(notes.textContent).toContain('Skipped 1 row(s)')
  })

  it('shows text from the file as text, never as HTML', async () => {
    await upload('date,campaign,impressions,clicks,spend\n2026-10-01,<img src=x onerror=alert(1)>,100,5,1')
    expect(await screen.findByRole('cell', { name: '<img src=x onerror=alert(1)>' })).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('applies a currency label to the numbers', async () => {
    const user = await upload(GOOD_CSV)
    await screen.findByRole('table')
    const input = screen.getByLabelText('Currency')
    await user.clear(input)
    await user.type(input, 'pkr')
    expect(within(screen.getByLabelText('Summary')).getByText('160.00 PKR')).toBeTruthy()
  })
})

describe('matching columns by hand', () => {
  const ODD = 'Date,Ad name,Shown,Taps,Kharcha\n2026-10-01,Eid Offer,2000,40,500\n2026-10-02,Eid Offer,3000,60,700'

  it('asks which column is which, then analyzes the file', async () => {
    const user = await upload(ODD)
    const dialog = await screen.findByRole('dialog', { name: 'Match your columns' })
    const apply = within(dialog).getByRole('button', { name: 'Use these columns' }) as HTMLButtonElement
    expect(apply.disabled).toBe(true)

    await user.selectOptions(within(dialog).getByLabelText(/^Campaign/), 'Ad name')
    await user.selectOptions(within(dialog).getByLabelText(/^Impressions/), 'Shown')
    await user.selectOptions(within(dialog).getByLabelText(/^Clicks/), 'Taps')
    await user.selectOptions(within(dialog).getByLabelText(/^Spend/), 'Kharcha')
    expect(apply.disabled).toBe(false)
    await user.click(apply)

    expect(await screen.findByRole('cell', { name: 'Eid Offer' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(within(screen.getByLabelText('Summary')).getByText('1,200.00 USD')).toBeTruthy()
  })

  it('can be cancelled', async () => {
    const user = await upload(ODD)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Try it with sample data' })).toBeTruthy()
  })
})

describe('rules and table', () => {
  it('lets the person change a rule and updates the insights', async () => {
    await openSample()
    const insights = within(screen.getByLabelText('Insights'))
    expect(insights.getByText(/High ad frequency/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Frequency limit/), { target: { value: '10' } })
    expect(insights.queryByText(/High ad frequency/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(insights.getByText(/High ad frequency/)).toBeTruthy()
  })

  it('sorts the table when a header is clicked', async () => {
    const user = await openSample()
    const header = screen.getByRole('columnheader', { name: /Spend/ })
    expect(header.getAttribute('aria-sort')).toBe('descending')
    await user.click(within(header).getByRole('button'))
    expect(header.getAttribute('aria-sort')).toBe('ascending')
    const firstRow = within(screen.getByRole('table')).getAllByRole('row')[1]
    expect(firstRow?.textContent).toContain('Brand Awareness') // smallest spend
  })
})
