import { toast } from '@/lib/toast'

export function showRealtimeNotificationToast(message: string) {
  toast.info(message)
}
