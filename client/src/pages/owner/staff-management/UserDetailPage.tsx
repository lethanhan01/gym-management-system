import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, Save, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { STAFF_POSITION_COLOR, USER_STATUS_COLOR } from '@/lib/owner-constants'
import {
  type StaffPosition,
  staffService,
  type StaffProfile,
  type StaffSchedule,
  type CreateStaffDto,
} from '@/services/staff.service'
import {
  Page,
  PageHeader,
  PageSkeleton,
  PageEmptyState,
  PageErrorState,
  Card,
  FormField,
  Input,
  Select,
  Button,
  ButtonLink,
  Badge,
  ConfirmDialog,
} from '@/components/ui'
import { toast } from '@/lib/toast'

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
  const POSITION_LABEL: Record<string, string> = {
    staff: t('staffManagement.detail.positions.staff'),
    trainer: t('staffManagement.detail.positions.trainer'),
    pt: t('staffManagement.detail.positions.pt'),
    owner: t('staffManagement.detail.positions.owner'),
  }
  const USER_STATUS_LABEL: Record<string, string> = {
    active: t('usersOverview.userStatus.active'),
    pending_verification: t('usersOverview.userStatus.pendingVerification'),
    locked: t('usersOverview.userStatus.locked'),
    deleted: t('usersOverview.userStatus.deleted'),
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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
  }, [id, isNew, t])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    const errors: Record<string, string> = {}
    if (!form.fullName) errors.fullName = t('staffManagement.detail.validation.nameRequired')
    if (!form.email) errors.email = t('staffManagement.detail.validation.emailRequired', { defaultValue: 'Email là bắt buộc' })

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (isNew) {
        const created = await staffService.create(form)
        toast.success(t('staffManagement.detail.createSuccess', { defaultValue: 'Thêm nhân viên thành công' }))
        navigate(`/owner/staff/${created.staffId}`, { replace: true })
      } else {
        const updated = await staffService.update(id!, {
          fullName: form.fullName,
          phone: form.phone || null,
          position: form.position,
        })
        setStaff(updated)
        toast.success(t('staffManagement.detail.updateSuccess', { defaultValue: 'Cập nhật thông tin thành công' }))
      }
    } catch (err) {
      toast.error(getApiError(err, t('staffManagement.detail.saveFailed')), {
        action: { label: tCommon('button.retry', { defaultValue: 'Thử lại' }), onClick: () => handleSave(e) },
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await staffService.delete(id!)
      toast.success(t('staffManagement.detail.terminateSuccess', { defaultValue: 'Xóa nhân viên thành công' }))
      navigate('/owner/staff', { replace: true })
    } catch (err) {
      toast.error(getApiError(err, t('staffManagement.detail.terminateFailed')), {
        action: { label: tCommon('button.retry', { defaultValue: 'Thử lại' }), onClick: handleDelete },
      })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading)
    return (
      <Page>
        <PageSkeleton rows={4} />
      </Page>
    )
  if (error)
    return (
      <Page>
        <PageErrorState message={error} onRetry={loadStaff} />
      </Page>
    )

  return (
    <Page>
      <PageHeader
        eyebrow={t('staffManagement.detail.eyebrow')}
        title={
          isNew
            ? t('staffManagement.detail.createTitle')
            : t('staffManagement.detail.editTitle', { name: staff?.fullName ?? '' })
        }
        description={
          isNew
            ? t('staffManagement.detail.createDesc')
            : t('staffManagement.detail.editDesc', { code: staff?.staffCode })
        }
        actions={
          !isNew && staff ? (
            <ButtonLink variant="outline-white" to="/owner/staff">
              <ArrowLeft size={16} /> {tCommon('button.back')}
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card variant="compact">
            <form onSubmit={handleSave} className="space-y-5">
              <h2 className="text-base font-bold text-white">
                {isNew
                  ? t('staffManagement.detail.newInfoTitle')
                  : t('staffManagement.detail.editInfoTitle')}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label={t('staffManagement.detail.form.name')}
                  required
                  error={formErrors.fullName}
                >
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder={t('staffManagement.detail.form.namePlaceholder')}
                    required
                  />
                </FormField>

                <FormField
                  label={t('staffManagement.detail.form.email')}
                  required
                  error={formErrors.email}
                >
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="nva@gym.local"
                    required
                    disabled={!isNew}
                  />
                </FormField>

                <FormField label={t('staffManagement.detail.form.phone')}>
                  <Input
                    type="tel"
                    value={form.phone ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0901234567"
                  />
                </FormField>

                <FormField label={t('staffManagement.detail.form.position')} required>
                  <Select
                    value={form.position}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, position: value as StaffPosition }))
                    }
                    required
                  >
                    <option value="staff">{t('staffManagement.detail.positions.staff')}</option>
                    <option value="trainer">{t('staffManagement.detail.positions.trainer')}</option>
                    <option value="owner">{t('staffManagement.detail.positions.owner')}</option>
                  </Select>
                </FormField>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                {isNew ? (
                  <ButtonLink
                    variant="outline-white"
                    to="/owner/staff"
                    className="w-full sm:w-auto"
                  >
                    {tCommon('button.cancel')}
                  </ButtonLink>
                ) : null}
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  className="w-full sm:w-auto"
                >
                  <Save size={16} />{' '}
                  {isNew ? t('staffManagement.detail.createBtn') : tCommon('button.save')}
                </Button>
              </div>
            </form>
          </Card>

          {!isNew && (
            <Card variant="compact">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">
                  {t('staffManagement.detail.scheduleTitle')}
                </h2>
              </div>
              {schedules.length === 0 ? (
                <PageEmptyState title={t('staffManagement.detail.noSchedule')} description="" />
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
            </Card>
          )}
        </div>

        {!isNew && staff && (
          <aside className="space-y-5">
            <Card variant="compact">
              <div className="rogym-avatar-ring mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                <span className="rogym-font-display text-2xl text-[var(--rogym-teal)]">
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
                <Badge
                  style={{
                    borderColor: `${STAFF_POSITION_COLOR[staff.position] ?? '#6b7280'}40`,
                    color: STAFF_POSITION_COLOR[staff.position] ?? '#6b7280',
                  }}
                >
                  {POSITION_LABEL[staff.position] ?? staff.position}
                </Badge>
                <Badge
                  style={{
                    borderColor: `${USER_STATUS_COLOR[staff.status] ?? '#6b7280'}40`,
                    color: USER_STATUS_COLOR[staff.status] ?? '#6b7280',
                  }}
                >
                  {USER_STATUS_LABEL[staff.status] ?? staff.status}
                </Badge>
              </div>
            </Card>

            {staff.staffId !== currentUser?.staffId && (
              <Card variant="compact">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  {t('staffManagement.detail.actions')}
                </h3>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <X size={16} /> {t('staffManagement.detail.terminate')}
                </Button>
              </Card>
            )}
          </aside>
        )}
      </div>

      {showDeleteConfirm && (
        <ConfirmDialog
          open={showDeleteConfirm}
          title={t('staffManagement.detail.terminate')}
          variant="danger"
          loading={deleting}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          description={t('staffManagement.detail.terminateConfirm', {
            name: staff?.fullName ?? '',
          })}
          confirmLabel={t('staffManagement.detail.terminateConfirmBtn')}
        />
      )}
    </Page>
  )
}
