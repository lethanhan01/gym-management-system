export function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score <= 1.5) return '#22c55e'
  if (score <= 2.5) return '#f59e0b'
  return '#ef4444'
}

export function scoreLabel(score: number | null): string {
  if (score === null) return '—'
  return score.toFixed(1)
}
