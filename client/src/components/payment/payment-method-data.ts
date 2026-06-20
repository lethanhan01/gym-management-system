import { Banknote, CreditCard, Wallet, type LucideIcon } from 'lucide-react'
import type { PaymentMethod } from '@/services/payment.service'

export interface PaymentMethodOption {
  value: PaymentMethod
  label: string
  shortLabel: string
  Icon: LucideIcon
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { value: 'cash', label: 'Tiền mặt', shortLabel: 'Tiền mặt', Icon: Banknote },
  { value: 'bank_card', label: 'Thẻ ngân hàng', shortLabel: 'Thẻ NH', Icon: CreditCard },
  { value: 'ewallet', label: 'Ví điện tử', shortLabel: 'Ví điện tử', Icon: Wallet },
]

export function getPaymentMethodLabel(method: PaymentMethod, compact = false): string {
  const option = PAYMENT_METHOD_OPTIONS.find((item) => item.value === method)
  return compact ? option?.shortLabel ?? method : option?.label ?? method
}

export function maskPaymentAccountRef(reference: string | null): string {
  if (!reference) return ''
  if (reference.length <= 4) return reference
  return `••••${reference.slice(-4)}`
}
