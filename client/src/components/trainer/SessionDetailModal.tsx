import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  CheckCircle,
  Clock3,
  LoaderCircle,
  MapPin,
  Pencil,
  Play,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDateTime, localDateTimeInputToIso, toDateTimeLocalInput } from '@/lib/date'
import { facilityService, type GymRoom } from '@/services/facility.service'
import { trainingService, type TrainingSessionDetail } from '@/services/training.service'
import { DateTimePickerInput } from '@/components/DateTimePickerInput'
import { TrainerSelect, TrainerStatusBadge } from '@/components/TrainerUI'

type ModalMode = 'view' | 'edit' | 'cancel' | 'status-confirm'

interface Props {
  sessionId: string | null
  onClose: () => void
  onUpdate?: () => void
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3 border-b border-white/5 py-3 last:border-0">
      <div className="mt-0.5 shrink-0 rogym-text-accent">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider rogym-text-dim">{label}</div>
        <div className="mt-0.5 font-medium text-white">{value}</div>
      </div>
    </div>
  )
}

export function SessionDetailModal({ sessionId, onClose, onUpdate }: Props) {
  const { t } = useTranslation('trainer')
  const [session, setSession] = useState<TrainingSessionDetail | null>(null)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ModalMode>('view')

  // Edit state
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [editRoomId, setEditRoomId] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editDuration, setEditDuration] = useState(60)
  const [saving, setSaving] = useState(false)

  // Cancel state
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Status confirm state
  const [statusTarget, setStatusTarget] = useState<'in_progress' | 'completed' | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    setFetchLoading(true)
    setError(null)
    setMode('view')
    setCancelReason('')
    setStatusTarget(null)
    try {
      const data = await trainingService.getSession(sessionId)
      setSession(data)
    } catch (err) {
      setError(getApiError(err, t('sessionModal.error.loadFailed')))
    } finally {
      setFetchLoading(false)
    }
  }, [sessionId, t])

  useEffect(() => {
    setSession(null)
    void load()
  }, [load])

  function enterEdit() {
    if (!session) return
    setEditRoomId(session.roomId ?? '')
    setEditStartTime(toDateTimeLocalInput(session.startTime))
    const mins = Math.round(
      (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000,
    )
    setEditDuration(Math.max(1, mins))
    setError(null)
    if (rooms.length === 0) {
      facilityService.listRooms().then(setRooms).catch(() => setRooms([]))
    }
    setMode('edit')
  }

  const editEndTime = useMemo(() => {
    if (!editStartTime || !Number.isFinite(editDuration) || editDuration <= 0) return ''
    const startIso = localDateTimeInputToIso(editStartTime)
    if (!startIso) return ''
    const start = new Date(startIso)
    return new Date(start.getTime() + editDuration * 60000).toISOString()
  }, [editStartTime, editDuration])

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    const startIso = localDateTimeInputToIso(editStartTime)
    if (!sessionId || !editRoomId || !startIso || !editEndTime) return
    setSaving(true)
    setError(null)
    try {
      await trainingService.updateSession(sessionId, {
        roomId: editRoomId,
        startTime: startIso,
        endTime: editEndTime,
      })
      onUpdate?.()
      await load()
    } catch (err) {
      setError(getApiError(err, t('sessionModal.error.saveFailed')))
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!sessionId) return
    setCancelling(true)
    setError(null)
    try {
      await trainingService.cancelSession(sessionId, cancelReason.trim() || undefined)
      onUpdate?.()
      await load()
    } catch (err) {
      setError(getApiError(err, t('sessionModal.error.cancelFailed')))
      setCancelling(false)
    }
  }

  async function handleStatusUpdate() {
    if (!sessionId || !statusTarget) return
    setUpdatingStatus(true)
    setError(null)
    try {
      await trainingService.updateSessionStatus(sessionId, statusTarget)
      onUpdate?.()
      await load()
    } catch (err) {
      setError(getApiError(err, t('sessionModal.error.statusFailed')))
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!sessionId) return null

  const editable =
    session != null &&
    session.status === 'scheduled' &&
    new Date(session.startTime) > new Date()
  const canStart = session?.status === 'scheduled'
  const canComplete = session?.status === 'scheduled' || session?.status === 'in_progress'

  // ── Render helpers ────────────────────────────────────────────────────────
  let modalTitle: React.ReactNode
  let modalBody: React.ReactNode
  let modalFooter: React.ReactNode = null

  if (fetchLoading || !session) {
    modalTitle = fetchLoading ? t('sessionModal.titleLoading') : (error ?? t('sessionModal.titleError'))
    modalBody = fetchLoading ? (
      <div className="flex justify-center py-10">
        <LoaderCircle size={26} className="animate-spin rogym-text-accent" />
      </div>
    ) : (
      <p className="text-sm rogym-text-secondary">{error}</p>
    )
  } else if (mode === 'status-confirm') {
    modalTitle = statusTarget === 'in_progress'
      ? t('sessionModal.titleStartSession')
      : t('sessionModal.titleCompleteSession')
    modalBody = (
      <p className="text-sm leading-6 rogym-text-secondary">
        {statusTarget === 'in_progress'
          ? t('sessionModal.confirmStartBody', { name: session.memberName })
          : t('sessionModal.confirmCompleteBody', { name: session.memberName })}
      </p>
    )
    modalFooter = (
      <>
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white"
          onClick={() => {
            setStatusTarget(null)
            setMode('view')
            setError(null)
          }}
          disabled={updatingStatus}
        >
          {t('sessionModal.btnDiscard')}
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          onClick={() => void handleStatusUpdate()}
          disabled={updatingStatus}
        >
          {updatingStatus && <LoaderCircle size={14} className="animate-spin" />}
          {statusTarget === 'in_progress'
            ? t('sessionModal.btnConfirmStart')
            : t('sessionModal.btnConfirmComplete')}
        </button>
      </>
    )
  } else if (mode === 'cancel') {
    modalTitle = t('sessionModal.titleCancelSession')
    modalBody = (
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('sessionModal.cancelReasonLabel')}</span>
          <textarea
            className="rogym-input min-h-24"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </label>
      </div>
    )
    modalFooter = (
      <>
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white"
          onClick={() => {
            setMode('view')
            setError(null)
          }}
          disabled={cancelling}
        >
          {t('sessionModal.btnKeepSchedule')}
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--danger"
          onClick={() => void handleCancel()}
          disabled={cancelling}
        >
          {cancelling ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <XCircle size={14} />
          )}
          {t('sessionModal.btnConfirmCancel')}
        </button>
      </>
    )
  } else if (mode === 'edit') {
    modalTitle = t('sessionModal.titleEditSession')
    modalBody = (
      <form
        id="session-edit-form"
        onSubmit={(e) => void handleSaveEdit(e)}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <label className="block space-y-2">
          <span className="rogym-field-label">{t('sessionModal.fieldRoom')}</span>
          <TrainerSelect value={editRoomId} onValueChange={setEditRoomId} required>
            <option value="">{t('sessionModal.selectRoom')}</option>
            {rooms.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomCode} - {room.name} ({room.capacity} {t('sessionModal.capacityUnit')})
              </option>
            ))}
          </TrainerSelect>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="block rogym-field-label">{t('sessionModal.fieldStartTime')}</span>
            <DateTimePickerInput
              value={editStartTime}
              onChange={setEditStartTime}
              aria-label={t('sessionModal.fieldStartTime')}
            />
          </div>
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('sessionModal.fieldDuration')}</span>
            <input
              className="rogym-input"
              type="number"
              min={15}
              max={360}
              step={15}
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              required
            />
          </label>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm rogym-text-secondary">
          <Clock3 size={15} className="shrink-0 rogym-text-accent" />
          {t('sessionModal.endTimePrefix')}{' '}
          {editEndTime ? toDateTimeLocalInput(editEndTime).replace('T', ' ') : t('sessionModal.endTimeUnknown')}
        </div>
      </form>
    )
    modalFooter = (
      <>
        <button
          type="button"
          className="rogym-btn rogym-btn--outline-white"
          onClick={() => {
            setMode('view')
            setError(null)
          }}
          disabled={saving}
        >
          {t('sessionModal.btnCancel')}
        </button>
        <button
          type="submit"
          form="session-edit-form"
          className="rogym-btn rogym-btn--primary"
          disabled={
            saving ||
            !editRoomId ||
            !editEndTime ||
            !Number.isFinite(editDuration) ||
            editDuration <= 0
          }
        >
          {saving && <LoaderCircle size={14} className="animate-spin" />}
          {t('sessionModal.btnSave')}
        </button>
      </>
    )
  } else {
    // view mode
    modalTitle = (
      <span className="flex flex-wrap items-center gap-2">
        {session.memberName}
        <TrainerStatusBadge status={session.status} />
      </span>
    )
    modalBody = (
      <div>
        {error && (
          <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <DetailRow icon={<UserRound size={16} />} label={t('sessionModal.labelStudent')} value={session.memberName} />
        <DetailRow
          icon={<CalendarClock size={16} />}
          label={t('sessionModal.labelStart')}
          value={formatDateTime(session.startTime)}
        />
        <DetailRow
          icon={<CalendarClock size={16} />}
          label={t('sessionModal.labelEnd')}
          value={formatDateTime(session.endTime)}
        />
        <DetailRow
          icon={<MapPin size={16} />}
          label={t('sessionModal.labelRoom')}
          value={session.roomName ?? t('sessionModal.noRoom')}
        />
      </div>
    )
    const hasActions = editable || canStart || canComplete
    if (hasActions) {
      modalFooter = (
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => {
                setStatusTarget('in_progress')
                setMode('status-confirm')
              }}
            >
              <Play size={14} /> {t('sessionModal.btnStart')}
            </button>
          )}
          {canComplete && (
            <button
              type="button"
              className="rogym-btn rogym-btn--primary"
              onClick={() => {
                setStatusTarget('completed')
                setMode('status-confirm')
              }}
            >
              <CheckCircle size={14} /> {t('sessionModal.btnComplete')}
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={enterEdit}
            >
              <Pencil size={14} /> {t('sessionModal.btnEdit')}
            </button>
          )}
          {editable && (
            <button
              type="button"
              className="rogym-btn rogym-btn--danger"
              onClick={() => {
                setMode('cancel')
                setError(null)
              }}
            >
              <XCircle size={14} /> {t('sessionModal.btnCancelSession')}
            </button>
          )}
        </div>
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-base font-bold text-white">{modalTitle}</h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated shrink-0"
            onClick={onClose}
            aria-label={t('sessionModal.ariaClose')}
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-6">{modalBody}</div>
        {modalFooter && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-white/5 px-6 py-4">
            {modalFooter}
          </div>
        )}
      </div>
    </div>
  )
}
