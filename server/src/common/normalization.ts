export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.trim()
}

export function normalizeVietnamPhone(value: string): string | null {
  if (!/^[+0-9().\s-]+$/.test(value)) return null
  const compact = value.replace(/[.\s()\-]/g, '')
  if (/^0\d{9}$/.test(compact)) return compact
  if (/^\+84\d{9}$/.test(compact)) return `0${compact.slice(3)}`
  return null
}
