import { type ReactNode } from 'react'
import { Badge } from './Badge'
import { Skeleton } from './Skeleton'
import { Alert } from './Alert'
import { cn } from '@/lib/utils'

export interface TimeSlot {
  slotIndex?: number
  startTime: string
  endTime: string
  available: boolean
  reason?: string
  label?: string
}

export interface TimeSlotPickerProps {
  slots: TimeSlot[]
  selectedSlot?: TimeSlot | null
  onSelectSlot: (slot: TimeSlot) => void
  loading?: boolean
  emptyMessage?: ReactNode
  columns?: 2 | 3 | 4
  className?: string
  slotClassName?: string
  timeZone?: string
  locale?: string
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
  emptyMessage = 'Không có ca tập khả dụng cho ngày đã chọn.',
  columns = 3,
  className,
  slotClassName,
  timeZone = 'Asia/Ho_Chi_Minh',
  locale = 'vi-VN',
}: TimeSlotPickerProps) {
  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
      })
    } catch {
      return iso
    }
  }

  function getSlotReasonLabel(reason?: string) {
    switch (reason) {
      case 'PAST_TIME':
        return 'Đã qua'
      case 'BUSY':
      case 'BOOKED':
      case 'TRAINER_BUSY':
        return 'Đã kín'
      case 'ROOM_FULL':
        return 'Hết phòng'
      default:
        return reason ?? 'Không khả dụng'
    }
  }

  if (loading) {
    return (
      <div className={cn('grid gap-2.5 py-1', columnClasses[columns], className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <Alert
        tone="neutral"
        variant="subtle"
        className="py-3"
        description={emptyMessage}
      />
    )
  }

  return (
    <div className={cn('grid gap-2.5', columnClasses[columns], className)}>
      {slots.map((slot, index) => {
        const isSelected =
          selectedSlot?.startTime === slot.startTime &&
          selectedSlot?.endTime === slot.endTime

        const isPast = slot.reason === 'PAST_TIME'

        return (
          <button
            key={slot.slotIndex ?? `${slot.startTime}-${index}`}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelectSlot(slot)}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl p-3 text-center text-sm font-semibold transition-all touch-manipulation',
              isSelected
                ? 'border-2 border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/20 text-white shadow-sm ring-1 ring-[var(--rogym-teal)]/40'
                : slot.available
                  ? 'border border-white/10 bg-white/[0.02] text-white hover:border-[var(--rogym-teal)]/40 hover:bg-white/[0.05]'
                  : 'cursor-not-allowed border border-white/5 bg-white/[0.01] text-white/30 opacity-50',
              slotClassName
            )}
          >
            <span>
              {slot.label ?? `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
            </span>
            {!slot.available && (
              <Badge
                tone={isPast ? 'muted' : 'danger'}
                size="sm"
                className="mt-1.5 text-[10px] py-0 px-1.5 font-normal"
              >
                {getSlotReasonLabel(slot.reason)}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
