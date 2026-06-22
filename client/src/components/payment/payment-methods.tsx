import { Banknote } from 'lucide-react'
import type { PaymentMethod } from '@/services/payment.service'
import { METHOD_ICON } from './payment-method-data'

export function PaymentMethodIcon({
  method,
  size = 18,
}: {
  method: PaymentMethod
  size?: number
}) {
  const Icon = METHOD_ICON[method] ?? Banknote
  return <Icon size={size} />
}
