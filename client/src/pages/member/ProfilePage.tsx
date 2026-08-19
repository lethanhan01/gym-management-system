import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, ConfirmDialog, FormField, Input } from '@/components/ui'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberErrorState,
} from '@/components/MemberUI'
import { Edit3, KeyRound, LogOut, Save, UserRound, X } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { initLiff } from '@/lib/liff'
import { formatDate } from '@/lib/date'
import { authService } from '@/services/auth.service'
import { memberService, type MemberProfile } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { toast } from '@/lib/toast'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'

function LineIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function isSyntheticLineEmail(email?: string | null): boolean {
  if (!email) return false
  return (
    email.startsWith('line_') ||
    email.includes('@line.user') ||
    email.includes('@mockline') ||
    email.includes('@line.local')
  )
}

export default function MemberProfilePage() {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const clearAuth = useAuthStore(state => state.clearAuth)
  const clearSubscription = useSubscriptionStore(state => state.clear)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

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

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    setProfileError(null)
    memberService
      .getProfile(user?.memberId ?? '')
      .then((data) => setProfile(data))
      .catch((err) => setProfileError(getApiError(err, t('profile.errorLoad'))))
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
      toast.success(t('profile.buttonSave') + ' thành công')
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
      setLineError(getApiError(err, 'Liên kết thất bại'))
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
      setLineError(getApiError(err, 'Hủy liên kết thất bại'))
    } finally {
      setLineLinking(false)
    }
  }

  function handleLogout() {
    setLogoutConfirmOpen(false)
    clearSubscription()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const rawEmail = profile?.email ?? user?.email ?? ''
  const isLineAccount = isSyntheticLineEmail(rawEmail)
  const displayName = profile?.fullName ?? user?.fullName ?? '--'
  const memberCodeText = profile?.memberCode ? `MC-${profile.memberCode}` : '--'
  const initials = displayName !== '--' ? displayName.trim().charAt(0).toUpperCase() : 'M'

  return (
    <MemberPage className="space-y-6">
      <MemberPageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.pageTitle')}
        description={t('profile.description')}
      />

      {loading ? (
        <MemberSkeleton rows={5} />
      ) : profileError ? (
        <MemberErrorState
          message={profileError}
          onRetry={() => {
            setLoading(true)
            setProfileError(null)
            memberService
              .getProfile(user?.memberId ?? '')
              .then((data) => setProfile(data))
              .catch((err) => setProfileError(getApiError(err, t('profile.errorLoad'))))
              .finally(() => setLoading(false))
          }}
        />
      ) : (
        <main className="grid gap-6 xl:grid-cols-2">
          {/* Card 1: Thông tin cá nhân */}
          <Card as="article" variant="compact" className="p-6 flex flex-col justify-between">
            <div>
              {/* Header profile info */}
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/5 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--rogym-teal)]/15 text-[var(--rogym-teal)] font-bold text-lg border border-[var(--rogym-teal)]/25">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-snug">{displayName}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-white/5 text-white/70 border border-white/10">
                        {memberCodeText}
                      </span>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <Button
                    variant="outline-white"
                    size="compact"
                    type="button"
                    onClick={startEdit}
                    leftIcon={<Edit3 size={14} />}
                  >
                    {t('profile.buttonEdit')}
                  </Button>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-1">
                <ProfileInfoRow
                  label={t('profile.fieldName')}
                  value={displayName}
                />
                <ProfileInfoRow
                  label={t('profile.fieldMemberId')}
                  value={
                    <span className="font-mono text-white/90">
                      {memberCodeText}
                    </span>
                  }
                />
                <ProfileInfoRow
                  label={t('profile.fieldEmail')}
                  value={
                    isLineAccount ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30">
                        <LineIcon className="w-3.5 h-3.5 fill-current" />
                        <span>{t('profile.lineLinkedBadge')}</span>
                      </div>
                    ) : (
                      rawEmail || '--'
                    )
                  }
                />

                {isEditing ? (
                  <div className="border-b border-white/5 py-3">
                    <FormField label={t('profile.fieldPhone')}>
                      <Input
                        type="tel"
                        size="sm"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="0901234567"
                        className="mt-1"
                      />
                    </FormField>
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.fieldPhone')}
                    value={profile?.phone ?? t('profile.notUpdated')}
                  />
                )}

                <ProfileInfoRow
                  label={t('profile.fieldBirthday')}
                  value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : t('profile.notUpdated')}
                />

                {isEditing ? (
                  <div className="border-b border-white/5 py-3">
                    <FormField label={t('profile.fieldAddress')}>
                      <Input
                        type="text"
                        size="sm"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Số nhà, đường, quận, thành phố"
                        className="mt-1"
                      />
                    </FormField>
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.fieldAddress')}
                    value={profile?.address ?? t('profile.notUpdated')}
                  />
                )}

                <ProfileInfoRow
                  label={t('profile.fieldTrainer')}
                  value={profile?.trainerName ?? t('profile.notAssigned')}
                />
              </div>
            </div>

            {isEditing && (
              <footer className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                <Button
                  variant="outline-white"
                  type="button"
                  className="flex-1"
                  onClick={cancelEdit}
                  disabled={profileSaving}
                  leftIcon={<X size={15} />}
                >
                  {t('profile.buttonCancel')}
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  className="flex-1"
                  onClick={handleSaveProfile}
                  loading={profileSaving}
                  leftIcon={<Save size={15} />}
                >
                  {t('profile.buttonSave')}
                </Button>
              </footer>
            )}
          </Card>

          {/* Card 2: Đổi mật khẩu */}
          <Card as="article" variant="compact" className="p-6 flex flex-col justify-between">
            <div>
              <header className="mb-5 flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl [background:color-mix(in_srgb,var(--rogym-teal)_12%,transparent)] rogym-text-accent">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t('profile.sectionPassword')}</h2>
                  <p className="text-xs text-white/50">{t('profile.fieldNewPassword')}</p>
                </div>
              </header>

              <form id="password-form" className="space-y-4" onSubmit={changePassword}>
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
              </form>
            </div>

            <footer className="mt-6 pt-4 border-t border-white/5">
              <Button
                form="password-form"
                type="submit"
                variant="primary"
                loading={saving}
                leftIcon={<KeyRound size={16} />}
                className="w-full"
              >
                {t('profile.buttonUpdatePassword')}
              </Button>
            </footer>
          </Card>

          {/* Card 3: LINE Account Link */}
          <Card as="article" variant="compact" className="p-6">
            <header className="mb-4 flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#06C755]/15 text-[#06C755]">
                  <LineIcon className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t('profile.sectionLine')}</h2>
                  <p className="text-xs text-white/50">
                    {lineLinked ? t('profile.lineLinkedDesc') : t('profile.lineNotLinked')}
                  </p>
                </div>
              </div>

              {lineLinked && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#06C755]/15 text-[#06C755] border border-[#06C755]/30">
                  {t('profile.lineLinkedBadge')}
                </span>
              )}
            </header>

            {lineError && (
              <Alert tone="error" description={lineError} className="mb-4" />
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-white/70">
                {lineLinked ? (
                  <span className="text-[#06C755] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#06C755]" />
                    {t('profile.lineLinkedBadge')}
                  </span>
                ) : (
                  <span className="text-white/50">{t('profile.lineNotLinked')}</span>
                )}
              </div>

              {lineLinked ? (
                <Button
                  variant="outline-white"
                  size="compact"
                  type="button"
                  loading={lineLinking}
                  loadingText="Đang xử lý..."
                  onClick={handleUnlinkLine}
                >
                  Hủy liên kết
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="compact"
                  type="button"
                  loading={lineLinking}
                  loadingText="Đang xử lý..."
                  onClick={handleLinkLine}
                  leftIcon={<LineIcon className="w-4 h-4 fill-current" />}
                >
                  Liên kết với LINE
                </Button>
              )}
            </div>
          </Card>

          {/* Card 4: Quản lý tài khoản & Đăng xuất */}
          <Card as="article" variant="compact" className="p-6 flex flex-col justify-between">
            <header className="mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <UserRound size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{t('profile.sectionAccount')}</h2>
                <p className="text-xs text-white/50">{t('profile.logoutDescription')}</p>
              </div>
            </header>

            <div className="mt-4">
              <Button
                variant="danger"
                type="button"
                className="w-full sm:w-auto"
                onClick={() => setLogoutConfirmOpen(true)}
                leftIcon={<LogOut size={16} />}
              >
                {t('profile.buttonLogout')}
              </Button>
            </div>
          </Card>
        </main>
      )}

      {/* Modal xác nhận đăng xuất */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleLogout}
        title={t('profile.confirmLogoutTitle')}
        description={t('profile.confirmLogoutDesc')}
        confirmLabel={t('profile.buttonLogout')}
        variant="danger"
      />
    </MemberPage>
  )
}
