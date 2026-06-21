import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LoaderCircle, LogOut, Save, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { authService } from '@/services/auth.service'
import { memberService, type MemberProfile } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import {
  SubmitButton,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'

export default function MemberProfilePage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    memberService
      .getProfile(user?.memberId ?? '')
      .then((data) => setProfile(data))
      .catch((err) => setError(getApiError(err, t('profile.errorLoad'))))
      .finally(() => setLoading(false))
  }, [user?.memberId])

  function startEdit() {
    setEditPhone(profile?.phone ?? '')
    setEditAddress(profile?.address ?? '')
    setProfileSaveError(null)
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
    setProfileSaveError(null)
  }

  async function handleSaveProfile() {
    setProfileSaving(true)
    setProfileSaveError(null)
    try {
      const updated = await memberService.updateProfile(user?.memberId ?? '', {
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || null,
      })
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      setProfileSaveError(getApiError(err, t('profile.errorSave')))
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setError(
        newPassword !== confirmPassword
          ? t('profile.errorPasswordMismatch')
          : t('profile.errorPasswordTooShort')
      )
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
      setSuccess(t('profile.successPasswordChange'))
    } catch (err) {
      setError(getApiError(err, t('profile.errorPasswordChange')))
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
        title={t('profile.pageTitle')}
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
              <h2 className="rogym-eyebrow">{t('profile.sectionInfo')}</h2>
            </div>

            {profileSaveError && (
              <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {profileSaveError}
              </div>
            )}

            <ProfileInfoRow label={t('profile.fieldName')} value={profile?.fullName ?? user?.fullName ?? '--'} />
            <ProfileInfoRow
              label={t('profile.fieldMemberId')}
              value={profile?.memberCode ? `MC-${profile.memberCode}` : '--'}
            />
            <ProfileInfoRow label={t('profile.fieldEmail')} value={profile?.email ?? user?.email ?? '--'} />

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.fieldPhone')}</label>
                <input
                  type="tel"
                  className="rogym-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.fieldPhone')} value={profile?.phone ?? t('profile.notUpdated')} />
            )}

            <ProfileInfoRow
              label={t('profile.fieldBirthday')}
              value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : t('profile.notUpdated')}
            />

            {isEditing ? (
              <div className="border-b border-white/5 py-3">
                <label className="mb-1.5 block rogym-field-label">{t('profile.fieldAddress')}</label>
                <input
                  type="text"
                  className="rogym-input"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Số nhà, đường, quận, thành phố"
                />
              </div>
            ) : (
              <ProfileInfoRow label={t('profile.fieldAddress')} value={profile?.address ?? t('profile.notUpdated')} />
            )}

            <ProfileInfoRow
              label={t('profile.fieldTrainer')}
              value={profile?.trainerName ?? t('profile.notAssigned')}
            />

            <div className="mt-auto pt-6 flex gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white flex-1"
                    onClick={cancelEdit}
                    disabled={profileSaving}
                  >
                    {t('profile.buttonCancel')}
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
                    {t('profile.buttonSave')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white flex-1"
                    onClick={startEdit}
                  >
                    {t('profile.buttonEdit')}
                  </button>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--danger flex-1"
                    onClick={logout}
                  >
                    <LogOut size={16} /> {t('profile.buttonLogout')}
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
              <h2 className="rogym-eyebrow">{t('profile.sectionPassword')}</h2>
            </div>
            {error && <TrainerErrorState message={error} />}
            {success && (
              <div className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
                {success}
              </div>
            )}
            <form className="flex flex-col flex-1" onSubmit={changePassword}>
              <div className="space-y-4">
                <ProfilePasswordField
                  label={t('profile.fieldCurrentPassword')}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <ProfilePasswordField
                  label={t('profile.fieldNewPassword')}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <ProfilePasswordField
                  label={t('profile.fieldConfirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
              <div className="mt-auto pt-4">
                <SubmitButton loading={saving}>
                  <KeyRound size={16} /> {t('profile.buttonUpdatePassword')}
                </SubmitButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </TrainerPage>
  )
}
