import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Clock, Trash2 } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { toast } from '@/lib/toast'
import { getApiError } from '@/lib/api-error'
import { trainingSessionService, type TrainingSession } from '@/services/training-session.service'

export interface CancelPtBookingModalProps {
  open: boolean
  session: TrainingSession | null
  onClose: () => void
  onSuccess: () => void
}

export function CancelPtBookingModal({
  open,
  session,
  onClose,
  onSuccess,
}: CancelPtBookingModalProps) {
  const { t, i18n } = useTranslation('member')
  const locale = i18n.language
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
    }
  }, [open])

  if (!session) return null

  const sessionStart = new Date(session.startTime)
  const isLessThan2Hours = sessionStart.getTime() - Date.now() < 2 * 60 * 60 * 1000

  const handleCancel = async () => {
    if (reason.trim().length < 3) {
      toast.error(t('workout.schedule.booking.cancelReasonRequired'))
      return
    }

    setLoading(true)
    try {
await trainingSessionService.cancelBooking(session.sessionId, reason.trim())
      toast.success(t('workout.schedule.booking.cancelSuccess'))
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(getApiError(err, t('workout.schedule.errorLoad')))
    } finally {
      setLoading(false)
    }
  }

  const formattedTime = sessionStart.toLocaleString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={t('workout.schedule.booking.cancelModalTitle')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('workout.schedule.buttonClose')}
          </Button>
          {!isLessThan2Hours && (
            <Button
              variant="danger"
              onClick={() => void handleCancel()}
              disabled={reason.trim().length < 3 || loading}
              loading={loading}
            >
              <Trash2 size={16} className="mr-1.5" />
              {t('workout.schedule.booking.confirmCancelBtn')}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Session Brief */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-sm">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Clock size={16} className="text-[var(--rogym-accent)]" />
            <span>{formattedTime}</span>
          </div>
          {session.trainerName && (
            <p className="mt-1 text-xs text-white/60">
              {t('workout.schedule.fieldTrainer')}: <span className="text-white">{session.trainerName}</span>
            </p>
          )}
        </div>

        {/* < 2h Late Cancellation Warning */}
        {isLessThan2Hours ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 shrink-0 text-amber-400" size={18} />
            <p>{t('workout.schedule.booking.lateCancelWarning')}</p>
          </div>
        ) : (
          /* Reason input */
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {t('workout.schedule.booking.cancelReasonPrompt')} <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('workout.schedule.booking.cancelReasonPlaceholder')}
              className="w-full rounded-xl border border-white/15 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 focus:border-rose-400 focus:outline-none"
              maxLength={255}
            />
            <div className="flex justify-end text-[11px] text-white/40">
              {reason.length}/255
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
