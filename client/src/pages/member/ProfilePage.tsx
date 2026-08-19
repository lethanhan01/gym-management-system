import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DatePickerInput,
  FormField,
  Input,
} from '@/components/ui'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberErrorState,
} from '@/components/MemberUI'
import { ChevronRight, Edit3, KeyRound, LogOut, Save, UserCheck, UserRound, X } from 'lucide-react'
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
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const clearSubscription = useSubscriptionStore((state) => state.clear)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState('')
  const [editDateOfBirth, setEditDateOfBirth] = useState('')
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
    authService
      .me()
      .then((me) => {
        setLineLinked(!!(me as { lineLinked?: boolean }).lineLinked)
      })
      .catch(() => { })
  }, [])

  function startEdit() {
    setEditFullName(profile?.fullName ?? user?.fullName ?? '')
    setEditDateOfBirth(profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '')
    setEditPhone(profile?.phone ?? '')
    setEditAddress(profile?.address ?? '')
    setIsEditing(true)
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  async function handleSaveProfile() {
    const trimmedName = editFullName.trim()
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error(t('profile.errorFullNameInvalid'))
      return
    }

    if (editDateOfBirth) {
      const birthDate = new Date(editDateOfBirth)
      if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
        toast.error(t('profile.errorBirthdayInvalid'))
        return
      }
    }

    setProfileSaving(true)
    try {
      const updated = await memberService.updateProfile(user?.memberId ?? '', {
        fullName: trimmedName,
        phone: editPhone.trim() || undefined,
        dateOfBirth: editDateOfBirth || null,
        address: editAddress.trim() || null,
      })
      setProfile(updated)
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          fullName: updated.fullName,
        })
      }
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
  const memberCodeText = profile?.memberCode ?? '--'

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
          <Card as="article" variant="compact" className="flex flex-col justify-between p-6">
            <header className="mb-6 border-b border-white/5 pb-5">
              <CardHeader
                responsive={false}
                icon={<Avatar name={displayName} size="lg" shape="rounded" tone="teal" border />}
                actions={
                  !isEditing && (
                    <Button
                      variant="outline-white"
                      size="compact"
                      type="button"
                      responsiveIconOnly
                      className="shrink-0 max-sm:h-9 max-sm:w-9 max-sm:justify-center max-sm:p-0"
                      onClick={startEdit}
                      leftIcon={<Edit3 size={15} />}
                      aria-label={t('profile.buttonEdit')}
                      title={t('profile.buttonEdit')}
                    >
                      {t('profile.buttonEdit')}
                    </Button>
                  )
                }
              >
                <CardTitle size="md" truncate title={displayName}>
                  {displayName}
                </CardTitle>
                <div className="pt-0.5">
                  <Badge tone="muted" size="sm" className="font-mono">
                    {memberCodeText}
                  </Badge>
                </div>
              </CardHeader>
            </header>

            <CardContent className="space-y-1 p-0">
              {isEditing ? (
                <div className="border-b border-white/5 py-3">
                  <FormField label={t('profile.fieldName')} required>
                    <Input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nhập họ và tên"
                      className="mt-1"
                    />
                  </FormField>
                </div>
              ) : (
                <ProfileInfoRow label={t('profile.fieldName')} value={displayName} />
              )}

              <ProfileInfoRow
                label={t('profile.fieldMemberId')}
                value={<span className="font-mono text-white/90">{memberCodeText}</span>}
              />
              <ProfileInfoRow
                label={t('profile.fieldEmail')}
                value={
                  isLineAccount ? (
                    <Badge tone="success" size="sm">
                      <LineIcon className="mr-1 inline h-3.5 w-3.5 fill-current" />
                      <span>{t('profile.lineLinkedBadge')}</span>
                    </Badge>
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

              {isEditing ? (
                <div className="border-b border-white/5 py-3">
                  <FormField label={t('profile.fieldBirthday')}>
                    <DatePickerInput
                      value={editDateOfBirth}
                      max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      onChange={(value) => setEditDateOfBirth(value)}
                      className="mt-1"
                    />
                  </FormField>
                </div>
              ) : (
                <ProfileInfoRow
                  label={t('profile.fieldBirthday')}
                  value={
                    profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : t('profile.notUpdated')
                  }
                />
              )}

              {isEditing ? (
                <div className="border-b border-white/5 py-3">
                  <FormField label={t('profile.fieldAddress')}>
                    <Input
                      type="text"
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
                value={
                  profile?.trainerName ? (
                    <Button
                      variant="outline-white"
                      size="xs"
                      type="button"
                      className="group inline-flex items-center gap-1.5 rounded-lg border-white/15 px-3 py-1 text-xs font-semibold text-white hover:border-[var(--rogym-teal)]/50 hover:bg-[var(--rogym-teal)]/10 hover:text-[var(--rogym-teal)] transition-all"
                      onClick={() => navigate('/member/choose-trainer')}
                      title={t('profile.buttonChangePt')}
                    >
                      <UserCheck size={13} className="text-[var(--rogym-teal)] shrink-0" />
                      <span className="truncate max-w-[160px] sm:max-w-[200px] font-medium">{profile.trainerName}</span>
                      <ChevronRight size={13} className="text-white/40 group-hover:text-[var(--rogym-teal)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline-white"
                      size="xs"
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border-dashed border-white/20 text-xs text-white/60 hover:border-[var(--rogym-teal)]/50 hover:text-[var(--rogym-teal)] transition-all"
                      onClick={() => navigate('/member/choose-trainer')}
                    >
                      <span>+ {t('profile.buttonChoosePt')}</span>
                    </Button>
                  )
                }
              />
            </CardContent>

            {isEditing && (
              <CardFooter className="mt-6 flex gap-3 border-t border-white/5 p-0 pt-4">
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
              </CardFooter>
            )}
          </Card>

          {/* Card 2: Đổi mật khẩu */}
          <Card as="article" variant="compact" className="flex flex-col justify-between p-6">
            <div>
              <header className="mb-5 border-b border-white/5 pb-4">
                <CardHeader icon={<KeyRound size={20} />}>
                  <CardTitle size="md">{t('profile.sectionPassword')}</CardTitle>
                  <CardDescription>{t('profile.fieldNewPassword')}</CardDescription>
                </CardHeader>
              </header>

              <CardContent className="p-0">
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
              </CardContent>
            </div>

            <CardFooter className="mt-6 border-t border-white/5 p-0 pt-4">
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
            </CardFooter>
          </Card>

          {/* Card 3: LINE Account Link */}
          <Card as="article" variant="compact" className="p-6">
            <header className="mb-4 border-b border-white/5 pb-4">
              <CardHeader
                icon={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#06C755]/15 text-[#06C755]">
                    <LineIcon className="h-5 w-5 fill-current" />
                  </div>
                }
                actions={
                  lineLinked ? (
                    <Badge tone="success" size="sm" className="hidden sm:inline-flex">
                      {t('profile.lineLinkedBadge')}
                    </Badge>
                  ) : undefined
                }
              >
                <CardTitle size="md">{t('profile.sectionLine')}</CardTitle>
                <CardDescription>
                  {lineLinked ? t('profile.lineLinkedDesc') : t('profile.lineNotLinked')}
                </CardDescription>
              </CardHeader>
            </header>

            <CardContent className="p-0">
              {lineError && <Alert tone="error" description={lineError} className="mb-4" />}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-white/70">
                  {lineLinked ? (
                    <span className="flex items-center gap-1.5 font-medium text-[#06C755]">
                      <span className="h-2 w-2 rounded-full bg-[#06C755]" />
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
                    leftIcon={<LineIcon className="h-4 w-4 fill-current" />}
                  >
                    Liên kết với LINE
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Quản lý tài khoản & Đăng xuất */}
          <Card as="article" variant="compact" className="flex flex-col justify-between p-6">
            <header className="mb-4 border-b border-white/5 pb-4">
              <CardHeader
                icon={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <UserRound size={20} />
                  </div>
                }
              >
                <CardTitle size="md">{t('profile.sectionAccount')}</CardTitle>
                <CardDescription>{t('profile.logoutDescription')}</CardDescription>
              </CardHeader>
            </header>

            <CardContent className="p-0 pt-2">
              <Button
                variant="danger"
                type="button"
                className="w-full sm:w-auto"
                onClick={() => setLogoutConfirmOpen(true)}
                leftIcon={<LogOut size={16} />}
              >
                {t('profile.buttonLogout')}
              </Button>
            </CardContent>
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
