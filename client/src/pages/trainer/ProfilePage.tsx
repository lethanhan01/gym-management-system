import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { KeyRound, LoaderCircle, LogOut, Save, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { authService } from '@/services/auth.service'
import { staffService, type StaffProfile } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  SubmitButton,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { toast } from 'sonner'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'
export default function TrainerProfilePage() {
  const { t } = useTranslation('trainer')
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const setAuth = useAuthStore(state => state.setAuth)
  const token = useAuthStore(state => state.token)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    staffService
      .getMe()
      .then((data) => setProfile(data))
      .catch((err) => toast.error(getApiError(err, t('profile.error.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  function startEdit() {
    setEditFullName(profile?.fullName ?? '')
    setEditPhone(profile?.phone ?? '')
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  async function handleSaveProfile() {
    const nameTrimmed = editFullName.trim()
    if (!nameTrimmed) {
      toast.error(t('profile.error.nameRequired'))
      return
    }
    setProfileSaving(true)
    try {
      const updated = await staffService.update(profile!.staffId, {
        fullName: nameTrimmed,
        phone: editPhone.trim() || null,
      })
      setProfile(updated)
      if (user && token) {
        setAuth({ ...user, fullName: updated.fullName }, token)
      }
      setIsEditing(false)
    } catch (err) {
      toast.error(getApiError(err, t('profile.error.saveFailed')))
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      toast.error(
        newPassword !== confirmPassword
          ? t('profile.error.passwordMismatch')
          : t('profile.error.passwordTooShort')
      )
      return
    }
    setSaving(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('profile.changePassword.success'))
    } catch (err) {
      toast.error(getApiError(err, t('profile.error.changePasswordFailed')))
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />
      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6 flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <UserRound size={22} />
              </div>
              <h2 className="rogym-eyebrow">{t('profile.personalInfo.title')}</h2>
            </div>

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.personalInfo.fullName')}</label>
                <input
                  type="text"
                  className="rogym-input"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.personalInfo.fullName')} value={profile?.fullName ?? user?.fullName ?? '--'} />
            )}

            <ProfileInfoRow label={t('profile.personalInfo.staffCode')} value={profile?.staffCode ?? '--'} />
            <ProfileInfoRow label={t('profile.personalInfo.email')} value={profile?.email ?? user?.email ?? '--'} />

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.personalInfo.phone')}</label>
                <input
                  type="tel"
                  className="rogym-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.personalInfo.phone')} value={profile?.phone ?? t('profile.personalInfo.noPhone')} />
            )}

            <ProfileInfoRow label={t('profile.personalInfo.position')} value={profile?.position ?? 'trainer'} />

            <div className="mt-auto pt-6 flex gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="outline-white"
                    className="flex-1"
                    onClick={cancelEdit}
                    disabled={profileSaving}
                  >
                    {t('profile.actions.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{' '}
                    {t('profile.actions.save')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline-white"
                    className="flex-1"
                    onClick={startEdit}
                  >
                    {t('profile.actions.edit')}
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={logout}
                  >
                    <LogOut size={16} /> {t('profile.actions.logout')}
                  </Button>
                </>
              )}
            </div>
          </section>

          <section className="rogym-card rogym-card--compact p-6 flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <KeyRound size={22} />
              </div>
              <h2 className="rogym-eyebrow">{t('profile.changePassword.title')}</h2>
            </div>
            <form className="flex flex-col flex-1" onSubmit={changePassword}>
              <div className="space-y-4">
                <ProfilePasswordField
                  label={t('profile.changePassword.currentPassword')}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <ProfilePasswordField
                  label={t('profile.changePassword.newPassword')}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <ProfilePasswordField
                  label={t('profile.changePassword.confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
              <div className="mt-auto pt-4">
                <SubmitButton loading={saving}>
                  <KeyRound size={16} /> {t('profile.changePassword.submit')}
                </SubmitButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </TrainerPage>
  )
}
