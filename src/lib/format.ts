const isMissing = (value: number | null | undefined): value is null | undefined =>
  value === null || value === undefined || Number.isNaN(value)

export function normalizeCurrency(input: string): string {
  const code = input.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : 'USD'
}

export function money(value: number | null, currency = 'USD'): string {
  if (isMissing(value)) return 'n/a'
  const number = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${number} ${currency}`
}

export function percent(value: number | null, digits = 2): string {
  return isMissing(value) ? 'n/a' : `${(value * 100).toFixed(digits)}%`
}

export function whole(value: number | null): string {
  return isMissing(value) ? 'n/a' : Math.round(value).toLocaleString('en-US')
}

export function multiple(value: number | null): string {
  return isMissing(value) ? 'n/a' : `${value.toFixed(2)}x`
}
