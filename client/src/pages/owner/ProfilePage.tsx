import { FormEvent, useEffect, useState } from 'react'
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
      .catch((err) => setError(getApiError(err, 'Không thể tải hồ sơ.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!editName.trim()) {
      setSaveError('Họ tên không được trống.')
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
      setSaveError(getApiError(err, 'Lưu thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (newPw.length < 8) {
      setPwError('Mật khẩu mới cần ít nhất 8 ký tự.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu xác nhận không khớp.')
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
      setPwError(getApiError(err, 'Không thể đổi mật khẩu.'))
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
        eyebrow="Hồ sơ"
        title="Tài khoản Owner"
        description="Quản lý thông tin cá nhân và bảo mật."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Card 1: Personal Info */}
        <div className="rogym-card rogym-card--compact p-6 flex flex-col">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
              <User size={22} />
            </div>
            <h2 className="rogym-eyebrow">Thông tin cá nhân</h2>
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
                  <label className="rogym-field-label mb-1.5 block">Họ tên</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rogym-input"
                    required
                  />
                </div>
                <div>
                  <label className="rogym-field-label mb-1.5 block">Số điện thoại</label>
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rogym-btn rogym-btn--primary flex-1"
                  disabled={saving}
                >
                  {saving ? <LoaderCircle size={16} className="animate-spin" /> : 'Lưu'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <ProfileInfoRow label="Họ tên" value={profile?.fullName ?? '—'} />
              <ProfileInfoRow label="Email" value={profile?.email ?? '—'} />
              <ProfileInfoRow label="Số điện thoại" value={profile?.phone ?? '—'} />
              <ProfileInfoRow label="Vai trò" value="Chủ sở hữu" />
              <div className="mt-auto pt-6 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1"
                  onClick={handleLogout}
                >
                  <LogOut size={16} /> Đăng xuất
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
            <h2 className="rogym-eyebrow">Đổi mật khẩu</h2>
          </div>

          {pwError && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 rounded-xl border border-green-400/20 bg-green-400/10 p-3 text-sm text-green-200">
              Đổi mật khẩu thành công!
            </div>
          )}

          <form onSubmit={handleChangePassword} className="flex flex-col flex-1">
            <div className="space-y-4">
              <ProfilePasswordField
                label="Mật khẩu hiện tại"
                value={currentPw}
                onChange={setCurrentPw}
              />
              <ProfilePasswordField label="Mật khẩu mới" value={newPw} onChange={setNewPw} />
              <ProfilePasswordField
                label="Xác nhận mật khẩu mới"
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
                {pwSaving ? <LoaderCircle size={16} className="animate-spin" /> : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </OwnerPage>
  )
}
