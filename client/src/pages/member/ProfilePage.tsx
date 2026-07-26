import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { KeyRound, LoaderCircle, LogOut, Save, UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { initLiff } from '@/lib/liff'
import { formatDate } from '@/lib/date'
import { authService } from '@/services/auth.service'
import { memberService, type MemberProfile } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import {
  SubmitButton,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { toast } from '@/lib/toast'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'

export default function MemberProfilePage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const [lineLinked, setLineLinked] = useState(false)
  const [lineLinking, setLineLinking] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)

  useEffect(() => {
    memberService
      .getProfile(user?.memberId ?? '')
      .then((data) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [t, user?.memberId])

  useEffect(() => {
    authService.me()
      .then((me) => { setLineLinked(!!(me as { lineLinked?: boolean }).lineLinked) })
      .catch(() => {})
  }, [])

  function startEdit() {
    setEditPhone(profile?.phone ?? '')
    setEditAddress(profile?.address ?? '')
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  async function handleSaveProfile() {
    setProfileSaving(true)
    try {
      const updated = await memberService.updateProfile(user?.memberId ?? '', {
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || null,
      })
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      toast.error(getApiError(err, t('profile.errorSave')))
    } finally {
      setProfileSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      toast.error(
        newPassword !== confirmPassword
          ? t('profile.errorPasswordMismatch')
          : t('profile.errorPasswordTooShort')
      )
      return
    }
    setSaving(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('profile.successPasswordChange'))
    } catch (err) {
      toast.error(getApiError(err, t('profile.errorPasswordChange')))
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkLine() {
    setLineLinking(true)
    setLineError(null)
    try {
      const liff = await initLiff()
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }
      const idToken = liff.getIDToken()
      if (!idToken) throw new Error('Không lấy được LINE idToken')
      await authService.linkLine(idToken)
      setLineLinked(true)
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Liên kết thất bại')
    } finally {
      setLineLinking(false)
    }
  }

  async function handleUnlinkLine() {
    setLineLinking(true)
    setLineError(null)
    try {
      await authService.unlinkLine()
      setLineLinked(false)
    } catch (err) {
      setLineError(err instanceof Error ? err.message : 'Hủy liên kết thất bại')
    } finally {
      setLineLinking(false)
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
                  <Button
                    variant="outline-white"
                    type="button"
                    className="flex-1"
                    onClick={cancelEdit}
                    disabled={profileSaving}
                  >
                    {t('profile.buttonCancel')}
                  </Button>
                  <Button
                    variant="primary"
                    type="button"
                    className="flex-1"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{' '}
                    {t('profile.buttonSave')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline-white"
                    type="button"
                    className="flex-1"
                    onClick={startEdit}
                  >
                    {t('profile.buttonEdit')}
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    className="flex-1"
                    onClick={logout}
                  >
                    <LogOut size={16} /> {t('profile.buttonLogout')}
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
              <h2 className="rogym-eyebrow">{t('profile.sectionPassword')}</h2>
            </div>
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

          {/* LINE Account Link */}
          <section className="rogym-card rogym-card--compact p-6 xl:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(0,195,0,0.12)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" fill="#06C755"/>
                </svg>
              </div>
              <h2 className="rogym-eyebrow">Tài khoản LINE</h2>
            </div>
            {lineError && (
              <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {lineError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">
                {lineLinked ? 'Đã liên kết với LINE' : 'Chưa liên kết với LINE'}
              </span>
              {lineLinked ? (
                <Button
                  variant="outline-white"
                  type="button"
                  onClick={handleUnlinkLine}
                  disabled={lineLinking}
                  className="text-sm disabled:opacity-50"
                >
                  {lineLinking ? 'Đang xử lý...' : 'Hủy liên kết'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleLinkLine}
                  disabled={lineLinking}
                  className="text-sm disabled:opacity-50"
                >
                  {lineLinking ? 'Đang xử lý...' : 'Liên kết với LINE'}
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </TrainerPage>
  )
}
