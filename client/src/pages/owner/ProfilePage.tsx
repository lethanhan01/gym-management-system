import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LoaderCircle, LogOut, User } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { authService } from '@/services/auth.service'
import { ownerService, type OwnerProfile } from '@/services/owner.service'
import { useAuthStore } from '@/stores/authStore'
import { OwnerPage, OwnerPageHeader, OwnerSkeleton, OwnerErrorState } from '@/components/OwnerUI'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'

export default function OwnerProfilePage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const [profile, setProfile] = useState<OwnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    ownerService
      .getMe()
      .then((data) => {
        setProfile(data)
        setEditName(data.fullName)
        setEditPhone(data.phone ?? '')
      })
      .catch((err) => setError(getApiError(err, t('profile.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!editName.trim()) {
      setSaveError(t('profile.nameRequired'))
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      setProfile((prev) =>
        prev ? { ...prev, fullName: editName.trim(), phone: editPhone.trim() || null } : prev
      )
      setIsEditing(false)
    } catch (err) {
      setSaveError(getApiError(err, t('profile.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) {
      setPwError(t('profile.passwordMinLength'))
      return
    }
    if (newPw !== confirmPw) {
      setPwError(t('profile.passwordMismatch'))
      return
    }
    setPwSaving(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await authService.changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setPwSuccess(true)
    } catch (err) {
      setPwError(getApiError(err, t('profile.changePasswordFailed')))
    } finally {
      setPwSaving(false)
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  if (loading)
    return (
      <OwnerPage>
        <OwnerSkeleton rows={5} />
      </OwnerPage>
    )
  if (error)
    return (
      <OwnerPage>
        <OwnerErrorState message={error} />
      </OwnerPage>
    )

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow={t('profile.title')}
        title={t('profile.accountTitle')}
        description={t('profile.subtitle')}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Card 1: Personal Info */}
        <div className="rogym-card rogym-card--compact p-6 flex flex-col">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
              <User size={22} />
            </div>
            <h2 className="rogym-eyebrow">{t('profile.personalInfo')}</h2>
          </div>

          {saveError && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {saveError}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="flex flex-col flex-1">
              <div className="space-y-4">
                <div>
                  <label className="rogym-field-label mb-1.5 block">{t('profile.fullName')}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rogym-input"
                    required
                  />
                </div>
                <div>
                  <label className="rogym-field-label mb-1.5 block">{t('profile.phone')}</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="rogym-input"
                    placeholder="0901234567"
                  />
                </div>
              </div>
              <div className="mt-auto pt-6 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1"
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(profile?.fullName ?? '')
                    setEditPhone(profile?.phone ?? '')
                    setSaveError(null)
                  }}
                >
                  {tCommon('button.cancel')}
                </button>
                <button
                  type="submit"
                  className="rogym-btn rogym-btn--primary flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    tCommon('button.save')
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <ProfileInfoRow label={t('profile.fullName')} value={profile?.fullName ?? '—'} />
              <ProfileInfoRow label={t('profile.email')} value={profile?.email ?? '—'} />
              <ProfileInfoRow label={t('profile.phone')} value={profile?.phone ?? '—'} />
              <ProfileInfoRow label={t('profile.role')} value={t('profile.roleOwner')} />
              <div className="mt-auto pt-6 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  {tCommon('button.edit')}
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> {tCommon('nav.logout')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Card 2: Change Password */}
        <div className="rogym-card rogym-card--compact p-6 flex flex-col">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
              <KeyRound size={22} />
            </div>
            <h2 className="rogym-eyebrow">{t('profile.changePassword')}</h2>
          </div>

          {pwError && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
              {t('profile.changePasswordSuccess')}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col flex-1">
            <div className="space-y-4">
              <ProfilePasswordField
                label={t('profile.currentPassword')}
                value={currentPw}
                onChange={setCurrentPw}
              />
              <ProfilePasswordField
                label={t('profile.newPassword')}
                value={newPw}
                onChange={setNewPw}
              />
              <ProfilePasswordField
                label={t('profile.confirmPassword')}
                value={confirmPw}
                onChange={setConfirmPw}
              />
            </div>
            <div className="mt-auto pt-4">
              <button
                type="submit"
                className="rogym-btn rogym-btn--primary w-full"
                disabled={pwSaving}
              >
                {pwSaving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  t('profile.changePasswordBtn')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </OwnerPage>
  )
}
