const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

export function formatVnd(value: number | string): string {
  return VND_FORMATTER.format(Number(value))
}
