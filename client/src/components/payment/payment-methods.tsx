import { Banknote } from 'lucide-react'
import type { PaymentMethod } from '@/services/payment.service'
import { PAYMENT_METHOD_OPTIONS } from './payment-method-data'

export function PaymentMethodIcon({
  method,
  size = 18,
}: {
  method: PaymentMethod
  size?: number
}) {
  const Icon =
    PAYMENT_METHOD_OPTIONS.find((item) => item.value === method)?.Icon ?? Banknote
  return <Icon size={size} />
}
