/** Rounds a value up to a "nice" number (1, 2, 5, or 10 times a power of ten) for chart axes. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const fraction = value / magnitude
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * magnitude
}

/** Evenly spaced tick values from 0 to max. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => (max * index) / count)
}

/** Indexes to label on a long axis, always including the first and the last. */
export function labelIndexes(length: number, maxLabels = 6): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index)
  const step = (length - 1) / (maxLabels - 1)
  return [...new Set(Array.from({ length: maxLabels }, (_, index) => Math.round(index * step)))]
}
