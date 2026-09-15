import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Award,
  Camera,
  Clock,
  Edit3,
  Eye,
  KeyRound,
  LoaderCircle,
  LogOut,
  Quote,
  Save,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, ConfirmDialog } from '@/components/ui'
import {
  SubmitButton,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
import { ProfileInfoRow } from '@/components/profile/ProfileInfoRow'
import { ProfilePasswordField } from '@/components/profile/ProfilePasswordField'
import { getApiError } from '@/lib/api-error'
import { toast } from '@/lib/toast'
import { authService } from '@/services/auth.service'
import { staffService, type StaffProfile } from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import { localizeSpecialty } from '@/pages/member/feedback/feedback-i18n'

const SPECIALTY_SUGGESTIONS = [
  'HIIT & Fat Loss',
  'Giảm mỡ & Thể lực',
  'Tăng cơ & Cải thiện vóc dáng',
  'Yoga & Pilates',
  'Master Powerlifter & Strength',
  'Functional Training & Bodybuilding',
  'Personal Training & Fitness',
]

export default function TrainerProfilePage() {
  const { t } = useTranslation('trainer')
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // Live editable fields
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSpecialty, setEditSpecialty] = useState('')
  const [editExperienceYears, setEditExperienceYears] = useState<number | ''>('')
  const [editBio, setEditBio] = useState('')

  // Avatar states
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarRemoveOpen, setAvatarRemoveOpen] = useState(false)
  const [avatarRemoving, setAvatarRemoving] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    staffService
      .getMe()
      .then((data) => {
        setProfile(data)
        syncEditFields(data)
      })
      .catch((err) => toast.error(getApiError(err, t('profile.error.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  function syncEditFields(data: StaffProfile) {
    setEditFullName(data.fullName ?? '')
    setEditPhone(data.phone ?? '')
    setEditSpecialty(data.specialty ?? '')
    setEditExperienceYears(data.experienceYears ?? '')
    setEditBio(data.bio ?? '')
  }

  function startEdit() {
    if (profile) syncEditFields(profile)
    setIsEditing(true)
  }

  function cancelEdit() {
    if (profile) syncEditFields(profile)
    setIsEditing(false)
  }

  async function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate format
    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      toast.error(t('profile.error.avatarFormat'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2. Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.error.avatarSize'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setAvatarUploading(true)
    try {
      const res = await staffService.uploadAvatar(file)
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatarFileId: res.avatarFileId,
              avatarUrl: res.avatarUrl,
            }
          : null
      )
      if (user) {
        setUser({ ...user, avatarUrl: res.avatarUrl })
      }
      toast.success(t('profile.avatar.uploadSuccess'))
    } catch (err) {
      toast.error(getApiError(err, t('profile.error.saveFailed')))
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirmRemoveAvatar() {
    setAvatarRemoving(true)
    try {
      await staffService.deleteAvatar()
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatarFileId: null,
              avatarUrl: null,
            }
          : null
      )
      if (user) {
        setUser({ ...user, avatarUrl: null })
      }
      setAvatarRemoveOpen(false)
      toast.success(t('profile.avatar.removeSuccess'))
    } catch (err) {
      toast.error(getApiError(err, t('profile.error.saveFailed')))
    } finally {
      setAvatarRemoving(false)
    }
  }

  async function handleSaveProfile() {
    const trimmedName = editFullName.trim()
    if (!trimmedName) {
      toast.error(t('profile.error.nameRequired'))
      return
    }
    if (trimmedName.length < 2 || trimmedName.length > 200) {
      toast.error(t('profile.error.nameInvalid'))
      return
    }

    let expNum: number | null = null
    if (editExperienceYears !== '') {
      expNum = Number(editExperienceYears)
      if (isNaN(expNum) || expNum < 0 || expNum > 50) {
        toast.error(t('profile.error.experienceInvalid'))
        return
      }
    }

    const trimmedBio = editBio.trim()
    if (trimmedBio.length > 1000) {
      toast.error(t('profile.error.bioTooLong'))
      return
    }

    setProfileSaving(true)
    try {
      const updated = await staffService.updateMe({
        fullName: trimmedName,
        phone: editPhone.trim() || null,
        specialty: editSpecialty.trim() || null,
        experienceYears: expNum,
        bio: trimmedBio || null,
      })

      setProfile(updated)
      syncEditFields(updated)
      if (user) {
        setUser({ ...user, fullName: updated.fullName })
      }
      setIsEditing(false)
      toast.success(t('profile.success.saved'))
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
    setSavingPassword(true)
    try {
      await authService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('profile.changePassword.success'))
    } catch (err) {
      toast.error(getApiError(err, t('profile.error.changePasswordFailed')))
    } finally {
      setSavingPassword(false)
    }
  }

  function logout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  // Live preview values
  const liveFullName = isEditing ? editFullName : (profile?.fullName ?? user?.fullName ?? '--')
  const liveSpecialty = isEditing ? editSpecialty : (profile?.specialty ?? '')
  const liveExperience = isEditing ? editExperienceYears : (profile?.experienceYears ?? '')
  const liveBio = isEditing ? editBio : (profile?.bio ?? '')
  const avatarSrc = profile?.avatarUrl ?? user?.avatarUrl ?? null
  const ratingAverage = profile?.ratingAverage ?? null
  const totalReviews = profile?.totalReviews ?? 0

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />

      {loading ? (
        <TrainerSkeleton rows={6} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-12">
          {/* CỘT TRÁI (7 cols): Card Hồ sơ Huấn luyện viên */}
          <section className="xl:col-span-7 flex flex-col gap-6">
            <Card as="article" className="p-6 rogym-card flex flex-col justify-between">
              {/* Card Header & Edit toggle */}
              <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base tracking-wide">
                      {t('profile.personalInfo.title')}
                    </h2>
                    <p className="text-xs rogym-text-muted">
                      {profile?.staffCode ? `#${profile.staffCode}` : '--'}
                    </p>
                  </div>
                </div>

                {!isEditing ? (
                  <Button
                    variant="outline-white"
                    size="sm"
                    leftIcon={<Edit3 size={15} />}
                    onClick={startEdit}
                  >
                    {t('profile.actions.edit')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline-white"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={profileSaving}
                      leftIcon={<X size={15} />}
                    >
                      {t('profile.actions.cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      leftIcon={
                        profileSaving ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Save size={15} />
                        )
                      }
                    >
                      {t('profile.actions.save')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Avatar Section */}
              <div className="mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="relative group">
                  <Avatar
                    src={avatarSrc}
                    name={liveFullName}
                    size="xl"
                    shape="circle"
                    tone="teal"
                    className="ring-2 ring-[var(--rogym-teal)]/30 shadow-lg"
                  />
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-xs">
                      <LoaderCircle size={22} className="animate-spin text-[var(--rogym-teal)]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarFileChange}
                      disabled={avatarUploading}
                    />
                    <Button
                      variant="outline-white"
                      size="xs"
                      leftIcon={<Camera size={14} />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? t('profile.avatar.uploading') : t('profile.avatar.change')}
                    </Button>

                    {avatarSrc && (
                      <Button
                        variant="danger"
                        size="xs"
                        leftIcon={<Trash2 size={13} />}
                        onClick={() => setAvatarRemoveOpen(true)}
                        disabled={avatarUploading}
                      >
                        {t('profile.avatar.remove')}
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] rogym-text-muted leading-relaxed">
                    {t('profile.avatar.hint')}
                  </p>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="space-y-3">
                {/* Họ tên */}
                {isEditing ? (
                  <div className="border-b border-white/5 py-3">
                    <label className="mb-1.5 block rogym-field-label">
                      {t('profile.personalInfo.fullName')}{' '}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      className="rogym-input"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder={t('profile.personalInfo.fullName')}
                      required
                    />
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.personalInfo.fullName')}
                    value={liveFullName}
                  />
                )}

                {/* Số điện thoại */}
                {isEditing ? (
                  <div className="border-b border-white/5 py-3">
                    <label className="mb-1.5 block rogym-field-label">
                      {t('profile.personalInfo.phone')}
                    </label>
                    <input
                      type="tel"
                      className="rogym-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="0901234567"
                    />
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.personalInfo.phone')}
                    value={profile?.phone ?? t('profile.personalInfo.noPhone')}
                  />
                )}

                {/* Email (read-only) */}
                <ProfileInfoRow
                  label={t('profile.personalInfo.email')}
                  value={profile?.email ?? user?.email ?? '--'}
                />

                {/* Mã nhân viên (read-only) */}
                <ProfileInfoRow
                  label={t('profile.personalInfo.staffCode')}
                  value={
                    <span className="font-mono text-sm px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/90">
                      {profile?.staffCode ?? '--'}
                    </span>
                  }
                />
              </div>

              {/* Khối Chuyên Môn & Năng Lực */}
              <div className="mt-6 pt-5 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Award size={16} className="text-[var(--rogym-teal)]" />
                  <span>{t('profile.professionalInfo.title')}</span>
                </div>

                {/* Chuyên môn chính */}
                {isEditing ? (
                  <div className="border-b border-white/5 pb-3">
                    <label className="mb-1.5 block rogym-field-label">
                      {t('profile.professionalInfo.specialty')}
                    </label>
                    <input
                      type="text"
                      className="rogym-input mb-2"
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      placeholder={t('profile.professionalInfo.specialtyPlaceholder')}
                      maxLength={100}
                    />
                    <div className="space-y-1.5">
                      <span className="text-[11px] rogym-text-muted">
                        {t('profile.professionalInfo.specialtySuggestions')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {SPECIALTY_SUGGESTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setEditSpecialty(item)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                              editSpecialty === item
                                ? 'bg-[var(--rogym-teal)]/20 border-[var(--rogym-teal)] text-[var(--rogym-teal)] font-semibold'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {localizeSpecialty(item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.professionalInfo.specialty')}
                    value={
                      liveSpecialty ? (
                        <span className="text-[var(--rogym-teal)] font-medium">
                          {localizeSpecialty(liveSpecialty)}
                        </span>
                      ) : (
                        t('profile.professionalInfo.noSpecialty')
                      )
                    }
                  />
                )}

                {/* Số năm kinh nghiệm */}
                {isEditing ? (
                  <div className="border-b border-white/5 pb-3">
                    <label className="mb-1.5 block rogym-field-label">
                      {t('profile.professionalInfo.experienceYears')} (0 - 50)
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        className="rogym-input pr-12"
                        value={editExperienceYears}
                        onChange={(e) =>
                          setEditExperienceYears(
                            e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10))
                          )
                        }
                        placeholder={t('profile.professionalInfo.experienceYearsPlaceholder')}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs rogym-text-muted">
                        {t('profile.professionalInfo.years')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <ProfileInfoRow
                    label={t('profile.professionalInfo.experienceYears')}
                    value={
                      liveExperience !== '' && Number(liveExperience) > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-white/50" />
                          <span>
                            {liveExperience} {t('profile.professionalInfo.years')}
                          </span>
                        </span>
                      ) : (
                        '--'
                      )
                    }
                  />
                )}

                {/* Tiểu sử / Bio */}
                {isEditing ? (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="rogym-field-label">
                        {t('profile.professionalInfo.bio')}
                      </label>
                      <span
                        className={`text-[11px] ${
                          editBio.length > 900 ? 'text-amber-400 font-bold' : 'rogym-text-muted'
                        }`}
                      >
                        {editBio.length} / 1000
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      className="rogym-input resize-y py-2 text-sm leading-relaxed"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={t('profile.professionalInfo.bioPlaceholder')}
                      maxLength={1000}
                    />
                  </div>
                ) : (
                  <div className="pt-2 space-y-1.5">
                    <span className="text-xs rogym-text-secondary block">
                      {t('profile.professionalInfo.bio')}
                    </span>
                    {liveBio ? (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs sm:text-sm text-white/80 leading-relaxed italic relative">
                        <Quote size={14} className="inline mr-1.5 text-white/30 -mt-1" />
                        {liveBio}
                      </div>
                    ) : (
                      <p className="text-xs rogym-text-muted italic">
                        {t('profile.professionalInfo.noBio')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons (Bottom) */}
              <div className="mt-8 pt-5 border-t border-white/5 flex gap-3">
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
                    <Button variant="outline-white" className="flex-1" onClick={startEdit}>
                      <Edit3 size={15} /> {t('profile.actions.edit')}
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={logout}>
                      <LogOut size={16} /> {t('profile.actions.logout')}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </section>

          {/* CỘT PHẢI (5 cols): Card Xem trước hồ sơ (Member Preview) & Card Đổi mật khẩu */}
          <section className="xl:col-span-5 flex flex-col gap-6">
            {/* Card 1: Xem trước hồ sơ hiển thị với Hội viên */}
            <Card as="article" className="p-6 rogym-card flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-[var(--rogym-teal)]" />
                  <h3 className="font-semibold text-white text-sm">
                    {t('profile.preview.title')}
                  </h3>
                </div>
                <Badge tone="success" size="xs">
                  {t('profile.preview.badge')}
                </Badge>
              </div>

              <p className="text-xs rogym-text-muted">
                {t('profile.preview.description')}
              </p>

              {/* Preview Card Body (phỏng theo thẻ chọn PT của học viên) */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg flex flex-col items-center text-center gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--rogym-teal)]/5 rounded-full blur-2xl pointer-events-none" />

                <Avatar
                  src={avatarSrc}
                  name={liveFullName}
                  size="lg"
                  shape="circle"
                  tone="teal"
                  className="shadow-md ring-2 ring-[var(--rogym-teal)]/40"
                />

                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {liveFullName || '--'}
                    </h4>
                    {isEditing && (
                      <span className="inline-flex items-center text-[10px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Live Preview
                      </span>
                    )}
                  </div>

                  {liveExperience !== '' && Number(liveExperience) > 0 ? (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-[11px] rogym-text-secondary flex items-center gap-0.5">
                        <Clock size={11} />
                        {liveExperience} {t('profile.professionalInfo.years')}
                      </span>
                    </div>
                  ) : null}

                  {liveSpecialty && (
                    <p className="text-xs text-[var(--rogym-teal)] font-medium flex items-center justify-center gap-1 pt-0.5">
                      <Award size={12} />
                      <span>{localizeSpecialty(liveSpecialty)}</span>
                    </p>
                  )}
                </div>

                {/* Rating & Review summary block */}
                <div className="w-full pt-1 flex flex-col items-center gap-1.5">
                  {ratingAverage != null && ratingAverage > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      <span>{ratingAverage.toFixed(1)}</span>
                      <span className="text-white/50 text-[11px] font-normal">
                        ({t('profile.preview.reviewsCount', { count: totalReviews })})
                      </span>
                    </div>
                  ) : (
                    <Badge tone="muted" size="xs">
                      {t('profile.preview.newBadge')}
                    </Badge>
                  )}
                </div>

                {/* Bio snippet on card */}
                {liveBio ? (
                  <p className="text-xs text-white/70 italic line-clamp-3 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 w-full text-center mt-1">
                    &ldquo;{liveBio}&rdquo;
                  </p>
                ) : (
                  <p className="text-[11px] text-white/40 italic mt-1">
                    {t('profile.professionalInfo.noBio')}
                  </p>
                )}
              </div>
            </Card>

            {/* Card 2: Đổi mật khẩu */}
            <Card as="article" className="p-6 rogym-card flex flex-col justify-between">
              <div className="mb-5 flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                  <KeyRound size={20} />
                </div>
                <h3 className="font-semibold text-white text-sm">
                  {t('profile.changePassword.title')}
                </h3>
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
                <div className="mt-6 pt-2">
                  <SubmitButton loading={savingPassword}>
                    <KeyRound size={16} /> {t('profile.changePassword.submit')}
                  </SubmitButton>
                </div>
              </form>
            </Card>
          </section>
        </div>
      )}

      {/* Modal Xác nhận gỡ ảnh đại diện */}
      <ConfirmDialog
        open={avatarRemoveOpen}
        onClose={() => setAvatarRemoveOpen(false)}
        onConfirm={handleConfirmRemoveAvatar}
        variant="danger"
        title={t('profile.avatar.removeConfirmTitle')}
        description={t('profile.avatar.removeConfirmDesc')}
        loading={avatarRemoving}
      />
    </TrainerPage>
  )
}
