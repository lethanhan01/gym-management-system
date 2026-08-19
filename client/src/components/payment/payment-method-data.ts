import { Banknote, CreditCard, Wallet, type LucideIcon } from 'lucide-react'
import type { PaymentMethod } from '@/services/payment.service'
import i18n from '@/lib/i18n'

export interface PaymentMethodOption {
  value: PaymentMethod
  label: string
  shortLabel: string
  Icon: LucideIcon
}

export const METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  bank_card: CreditCard,
  ewallet: Wallet,
}

const METHOD_KEYS = {
  cash:      { full: 'paymentMethod.cash' as const,      short: 'paymentMethod.cashShort' as const },
  bank_card: { full: 'paymentMethod.bankCard' as const,  short: 'paymentMethod.bankCardShort' as const },
  ewallet:   { full: 'paymentMethod.ewallet' as const,   short: 'paymentMethod.ewalletShort' as const },
} satisfies Record<PaymentMethod, { full: string; short: string }>

export function getPaymentMethodLabel(method: PaymentMethod, compact = false): string {
  const keys = METHOD_KEYS[method]
  if (!keys) return method
  return i18n.t(compact ? keys.short : keys.full, { ns: 'common' })
}

export function getPaymentMethodOptions(): PaymentMethodOption[] {
  return (Object.keys(METHOD_KEYS) as PaymentMethod[]).map((value) => ({
    value,
    label: getPaymentMethodLabel(value, false),
    shortLabel: getPaymentMethodLabel(value, true),
    Icon: METHOD_ICON[value],
  }))
}

export function getSavablePaymentMethodOptions(): PaymentMethodOption[] {
  return getPaymentMethodOptions().filter((opt) => opt.value !== 'cash')
}



export function maskPaymentAccountRef(reference: string | null): string {
  if (!reference) return ''
  if (reference.length <= 4) return reference
  return `••••${reference.slice(-4)}`
}
