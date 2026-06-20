import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'
import { AuthShell, BtnPrimary, TextLink, MutedLink, Field, ErrorMsg } from './_authui'

const roleRouteMap: Record<string, string> = {
  member: '/member',
  trainer: '/trainer',
  staff: '/staff',
  owner: '/owner',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overlayEndDate, setOverlayEndDate] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const clearSubscription = useSubscriptionStore((s) => s.clear)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user, token } = await authService.login(email, pass)
      setAuth(user, token)
      clearSubscription()

      if (user.roles[0] === 'member' && user.memberId) {
        try {
          const subs = await subscriptionService.getByMember(String(user.memberId))
          const now = new Date()
          const hasValid = subs.some((s) => s.status === 'active' && new Date(s.endDate) >= now)
          if (hasValid) {
            navigate('/member', { replace: true })
          } else {
            const pendingSub = subs.find((s) => s.status === 'pending' && s.package)
            if (pendingSub?.package) {
              navigate('/member/subscription/buy/payment', {
                replace: true,
                state: {
                  packageId: pendingSub.packageId,
                  packageName: pendingSub.package.name,
                  price: Number(pendingSub.package.price),
                  durationDays: pendingSub.package.durationDays,
                  trainerId: pendingSub.trainerId,
                  subscriptionId: pendingSub.subscriptionId,
                },
              })
            } else {
              const lastSub = subs
                .filter((s) => s.status === 'active' || s.status === 'expired')
                .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
              if (lastSub) {
                setOverlayEndDate(lastSub.endDate)
              } else {
                navigate('/member/subscription/setup', { replace: true })
              }
            }
          }
        } catch {
          navigate('/member', { replace: true })
        }
      } else {
        navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
      }
    } catch {
      setError('Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  function fmtExpiry(iso: string) {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }

  return (
    <>
      {overlayEndDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] p-6 shadow-2xl">
            <h2 className="mb-3 text-lg font-bold text-white">Gói tập đã hết hạn</h2>
            <p className="mb-6 text-sm rogym-text-secondary">
              Gói đã hết hạn từ ngày {fmtExpiry(overlayEndDate)}. Vui lòng gia hạn thêm gói mới để
              tiếp tục sử dụng dịch vụ.
            </p>
            <div className="flex justify-end">
              <button
                className="rogym-btn rogym-btn--primary"
                onClick={() => navigate('/member/subscription/setup', { replace: true })}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
      <AuthShell>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold text-white">Chào mừng trở lại</h1>
            <p className="text-sm text-white/70">Đăng nhập để tiếp tục hành trình của bạn</p>
          </div>

          <div className="space-y-4">
            <Field
              label="Email"
              type="email"
              placeholder="ten@email.com"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={setPass}
            />
          </div>

          <div className="flex justify-end">
            <MutedLink to="/forgot-password">Quên mật khẩu?</MutedLink>
          </div>

          {error && <ErrorMsg message={error} />}

          <BtnPrimary type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </BtnPrimary>

          <p className="text-center text-sm text-white/70">
            Chưa có tài khoản? <TextLink to="/member/register">Đăng ký ngay</TextLink>
          </p>
        </form>
      </AuthShell>
    </>
  )
}
