import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, Save, LoaderCircle, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { STAFF_POSITION_COLOR, USER_STATUS_COLOR, USER_STATUS_LABEL } from '@/lib/owner-constants'
import {
  type StaffPosition,
  staffService,
  type StaffProfile,
  type StaffSchedule,
  type CreateStaffDto,
} from '@/services/staff.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
  OwnerSelect,
} from '@/components/OwnerUI'

export default function UserDetailPage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const currentUser = useAuthStore((s) => s.user)

  const SHIFT_LABEL: Record<string, string> = {
    morning: t('staffManagement.detail.shifts.morning'),
    afternoon: t('staffManagement.detail.shifts.afternoon'),
    evening: t('staffManagement.detail.shifts.evening'),
    night: t('staffManagement.detail.shifts.night'),
  }

  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateStaffDto>({
    email: '',
    fullName: '',
    phone: '',
    position: 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadStaff = useCallback(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    staffService
      .get(id!)
      .then((s) => {
        setStaff(s)
        setForm({
          email: s.email,
          fullName: s.fullName,
          phone: s.phone ?? '',
          position: s.position,
        })
      })
      .catch((err) => setError(getApiError(err, t('staffManagement.detail.loadFailed'))))
      .finally(() => setLoading(false))

    staffService
      .getSchedules(id!)
      .then(setSchedules)
      .catch(() => {})
  }, [id, isNew])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.fullName) {
      setSaveError(t('staffManagement.detail.validation.nameRequired'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      if (isNew) {
        const created = await staffService.create(form)
        navigate(`/owner/staff/${created.staffId}`, { replace: true })
      } else {
        const updated = await staffService.update(id!, {
          fullName: form.fullName,
          phone: form.phone || null,
          position: form.position,
        })
        setStaff(updated)
      }
    } catch (err) {
      setSaveError(getApiError(err, t('staffManagement.detail.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await staffService.delete(id!)
      navigate('/owner/staff', { replace: true })
    } catch (err) {
      setError(getApiError(err, t('staffManagement.detail.terminateFailed')))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading)
    return (
      <OwnerPage>
        <OwnerSkeleton rows={4} />
      </OwnerPage>
    )
  if (error)
    return (
      <OwnerPage>
        <OwnerErrorState message={error} onRetry={loadStaff} />
      </OwnerPage>
    )

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow={t('staffManagement.detail.eyebrow')}
        title={isNew ? t('staffManagement.detail.createTitle') : t('staffManagement.detail.editTitle', { name: staff?.fullName ?? '' })}
        description={isNew ? t('staffManagement.detail.createDesc') : t('staffManagement.detail.editDesc', { code: staff?.staffCode })}
        actions={
          !isNew && staff ? (
            <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff">
              <ArrowLeft size={16} /> {tCommon('button.back')}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <form onSubmit={handleSave} className="rogym-card rogym-card--compact p-6 space-y-5">
            <h2 className="text-base font-bold text-white">
              {isNew ? t('staffManagement.detail.newInfoTitle') : t('staffManagement.detail.editInfoTitle')}
            </h2>

            {saveError && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {saveError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="rogym-field-label mb-1.5 block">{t('staffManagement.detail.form.name')}</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="rogym-input"
                  placeholder={t('staffManagement.detail.form.namePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">{t('staffManagement.detail.form.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="rogym-input"
                  placeholder="nva@gym.local"
                  required
                  disabled={!isNew}
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">{t('staffManagement.detail.form.phone')}</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rogym-input"
                  placeholder="0901234567"
                />
              </div>
              <div>
                <label className="rogym-field-label mb-1.5 block">{t('staffManagement.detail.form.position')}</label>
                <OwnerSelect
                  value={form.position}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, position: value as StaffPosition }))
                  }
                  required
                >
                  <option value="staff">{t('staffManagement.detail.positions.staff')}</option>
                  <option value="trainer">{t('staffManagement.detail.positions.trainer')}</option>
                  <option value="owner">{t('staffManagement.detail.positions.owner')}</option>
                </OwnerSelect>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {isNew ? (
                <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff">
                  {tCommon('button.cancel')}
                </Link>
              ) : null}
              <button type="submit" className="rogym-btn rogym-btn--primary" disabled={saving}>
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                <Save size={16} /> {isNew ? t('staffManagement.detail.createBtn') : tCommon('button.save')}
              </button>
            </div>
          </form>

          {!isNew && (
            <div className="rogym-card rogym-card--compact p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">{t('staffManagement.detail.scheduleTitle')}</h2>
              </div>
              {schedules.length === 0 ? (
                <OwnerEmptyState
                  title={t('staffManagement.detail.noSchedule')}
                  description=""
                />
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => (
                    <div
                      key={s.scheduleId}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {formatDate(s.workDate)}
                        </div>
                        <div className="text-xs rogym-text-dim">
                          {SHIFT_LABEL[s.shift] ?? s.shift}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isNew && staff && (
          <aside className="space-y-5">
            <div className="rogym-card rogym-card--compact p-6">
              <div className="rogym-avatar-ring mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <span className="rogym-font-display text-2xl rogym-text-green">
                  {staff.fullName
                    .split(' ')
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(-2)
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{staff.fullName}</h3>
              <p className="text-sm rogym-text-secondary">{staff.email}</p>
              {staff.phone && <p className="text-sm rogym-text-dim">{staff.phone}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <OwnerBadge
                  label={staff.position}
                  color={STAFF_POSITION_COLOR[staff.position] ?? '#6b7280'}
                />
                <OwnerBadge
                  label={USER_STATUS_LABEL[staff.status] ?? staff.status}
                  color={USER_STATUS_COLOR[staff.status] ?? '#6b7280'}
                />
              </div>
            </div>

            {staff.staffId !== currentUser?.staffId && (
              <div className="rogym-card rogym-card--compact p-6">
                <h3 className="mb-3 text-sm font-semibold text-white">{t('staffManagement.detail.actions')}</h3>
                {!showDeleteConfirm ? (
                  <button
                    className="rogym-btn rogym-btn--danger w-full"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <X size={16} /> {t('staffManagement.detail.terminate')}
                  </button>
                ) : (
                  <div className="rogym-error-alert space-y-3">
                    <p className="text-sm">
                      {t('staffManagement.detail.terminateConfirm', { name: staff?.fullName ?? '' })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rogym-btn rogym-btn--outline-white"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        {tCommon('button.cancel')}
                      </button>
                      <button
                        className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        {deleting && <LoaderCircle size={14} className="animate-spin" />} {t('staffManagement.detail.terminateConfirmBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </OwnerPage>
  )
}
