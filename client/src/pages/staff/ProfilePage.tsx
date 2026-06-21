import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, LoaderCircle, LogOut, Save, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { authService } from '@/services/auth.service'
import { staffService, type StaffProfile } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  SubmitButton,
} from '@/components/StaffUI'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'

export default function StaffProfilePage() {
  const { t } = useTranslation('staff')
  const navigate = useNavigate()
  const { user, clearAuth, setAuth, token } = useAuthStore()
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    staffService
      .getMe()
      .then(setProfile)
      .catch((err) => setError(getApiError(err, t('profile.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  function startEdit() {
    setEditFullName(profile?.fullName ?? '')
    setEditPhone(profile?.phone ?? '')
    setProfileSaveError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setProfileSaveError(null)
  }

  async function handleSaveProfile() {
    const nameTrimmed = editFullName.trim()
    if (!nameTrimmed) {
      setProfileSaveError(t('profile.fullNameRequired'))
      return
    }
    setProfileSaving(true)
    setProfileSaveError(null)
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
      setProfileSaveError(getApiError(err, t('profile.saveFailed')))
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError(t('profile.passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      return
    }
    setSaving(true)
    setError(null)
    setSuccess('')
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess(t('profile.changePasswordSuccess'))
    } catch (err) {
      setError(getApiError(err, t('profile.changePasswordFailed')))
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />
      {loading ? (
        <StaffSkeleton rows={5} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rogym-card rogym-card--compact p-6 flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <UserRound size={22} />
              </div>
              <h2 className="rogym-eyebrow">{t('profile.personalInfo')}</h2>
            </div>

            {profileSaveError && (
              <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {profileSaveError}
              </div>
            )}

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.fullName')}</label>
                <input
                  type="text"
                  className="rogym-input"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.fullName')} value={profile?.fullName ?? user?.fullName ?? '--'} />
            )}

            <ProfileInfoRow label={t('profile.staffCode')} value={profile?.staffCode ?? '--'} />
            <ProfileInfoRow label={t('profile.email')} value={profile?.email ?? user?.email ?? '--'} />

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.phone')}</label>
                <input
                  type="tel"
                  className="rogym-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.phone')} value={profile?.phone ?? t('profile.phoneNotSet')} />
            )}

            <ProfileInfoRow label={t('profile.position')} value={profile?.position ?? 'staff'} />

            <div className="mt-auto pt-6 flex gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white flex-1"
                    onClick={cancelEdit}
                    disabled={profileSaving}
                  >
                    {t('profile.cancel')}
                  </button>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--primary flex-1"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{' '}
                    {t('profile.save')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white flex-1"
                    onClick={startEdit}
                  >
                    {t('profile.edit')}
                  </button>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--danger flex-1"
                    onClick={logout}
                  >
                    <LogOut size={16} /> {t('profile.logout')}
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="rogym-card rogym-card--compact p-6 flex flex-col">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <KeyRound size={22} />
              </div>
              <h2 className="rogym-eyebrow">{t('profile.changePassword')}</h2>
            </div>
            {error && <StaffErrorState message={error} />}
            {success && (
              <div className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
                {success}
              </div>
            )}
            <form className="flex flex-col flex-1" onSubmit={changePassword}>
              <div className="space-y-4">
                <ProfilePasswordField
                  label={t('profile.currentPassword')}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <ProfilePasswordField
                  label={t('profile.newPassword')}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <ProfilePasswordField
                  label={t('profile.confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
              <div className="mt-auto pt-4">
                <SubmitButton loading={saving}>
                  <KeyRound size={16} /> {t('profile.updatePassword')}
                </SubmitButton>
              </div>
            </form>
          </section>

        </div>
      )}
    </StaffPage>
  )
}
