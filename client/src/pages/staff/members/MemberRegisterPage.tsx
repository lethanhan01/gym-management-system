import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Dumbbell, User, CreditCard } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { memberService } from '@/services/member.service'
import packageService, { type Package } from '@/services/package.service'
import { DatePickerInput } from '@/components/DatePickerInput'
import {
  StaffPage,
  StaffPageHeader,
  StaffErrorState,
  StaffSkeleton,
} from '@/components/StaffUI'

type PaymentMethod = 'cash' | 'bank_card' | 'ewallet'

interface MemberFormData {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  address: string
  password: string
  confirmPassword: string
}

interface PaymentFormData {
  paymentMethod: PaymentMethod
  transactionReference: string
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_card', label: 'Thẻ ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

const STEPS = [
  { n: 1, label: 'Thông tin hội viên', icon: User },
  { n: 2, label: 'Chọn gói tập', icon: Dumbbell },
  { n: 3, label: 'Thanh toán', icon: CreditCard },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = current > s.n
        const active = current === s.n
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  done
                    ? 'bg-[var(--rogym-green)] text-white'
                    : active
                      ? 'border-2 border-[var(--rogym-green)] text-[var(--rogym-green)] bg-transparent'
                      : 'border border-white/20 rogym-text-dim bg-transparent',
                ].join(' ')}
              >
                {done ? <Check size={16} strokeWidth={2.5} /> : s.n}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-[var(--rogym-teal)]' : done ? 'rogym-text-secondary' : 'rogym-text-dim',
                ].join(' ')}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-px mx-3 mb-5',
                  done ? 'bg-[var(--rogym-green)]' : 'bg-white/10',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Step1({
  data,
  onChange,
  onNext,
}: {
  data: MemberFormData
  onChange: (d: MemberFormData) => void
  onNext: () => void
}) {
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof MemberFormData, value: string) {
    onChange({ ...data, [field]: value })
  }

  function handleNext(e: FormEvent) {
    e.preventDefault()
    if (data.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }
    if (data.password !== data.confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    setError(null)
    onNext()
  }

  return (
    <form onSubmit={handleNext} className="space-y-4">
      {error && <StaffErrorState message={error} />}

      <div className="rogym-card rogym-card--compact p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="rogym-field-label">Họ và tên *</span>
            <input
              className="rogym-input"
              value={data.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Email *</span>
            <input
              type="email"
              className="rogym-input"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="email@example.com"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Số điện thoại</span>
            <input
              type="tel"
              className="rogym-input"
              value={data.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0901 234 567"
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Ngày sinh *</span>
            <DatePickerInput
              value={data.dateOfBirth}
              onChange={(v) => set('dateOfBirth', v)}
              max={new Date().toISOString().split('T')[0]}
              aria-label="Ngày sinh"
            />
          </label>

          <label className="col-span-full block space-y-2">
            <span className="rogym-field-label">Địa chỉ</span>
            <input
              className="rogym-input"
              value={data.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Mật khẩu *</span>
            <input
              type="password"
              className="rogym-input"
              value={data.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              minLength={8}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Xác nhận mật khẩu *</span>
            <input
              type="password"
              className="rogym-input"
              value={data.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="rogym-btn rogym-btn--primary flex items-center gap-2">
          Tiếp theo <ChevronRight size={16} />
        </button>
      </div>
    </form>
  )
}

function Step2({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: Package | null
  onSelect: (pkg: Package) => void
  onBack: () => void
  onNext: () => void
}) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    packageService
      .list({ status: 'active', pageSize: 50 })
      .then((res) => setPackages(res.data))
      .catch(() => setError('Không thể tải danh sách gói tập.'))
      .finally(() => setLoading(false))
  }, [])

  function formatPrice(price: string) {
    return Number(price).toLocaleString('vi-VN') + 'đ'
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <StaffSkeleton rows={3} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isSelected = selected?.packageId === pkg.packageId
            return (
              <button
                key={pkg.packageId}
                type="button"
                onClick={() => onSelect(pkg)}
                className={[
                  'rogym-card rogym-card--interactive w-full p-5 text-left transition-all',
                  isSelected
                    ? 'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.08)] ring-1 ring-[var(--rogym-green)]'
                    : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-white">{pkg.name}</h3>
                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--rogym-green)]">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="rogym-text-dim">Thời hạn</span>
                    <span className="rogym-text-secondary font-medium">{pkg.durationDays} ngày</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="rogym-text-dim">Giá</span>
                    <span className="text-[var(--rogym-teal)] font-bold">{formatPrice(pkg.price)}</span>
                  </div>
                  {pkg.includesPt && (
                    <div className="mt-2">
                      <span className="rogym-tone-badge" data-tone="info">Bao gồm PT</span>
                    </div>
                  )}
                </div>

                {pkg.benefits && (
                  <p className="mt-3 text-xs rogym-text-dim border-t border-white/5 pt-3">
                    {pkg.benefits}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack}>
          Quay lại
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          onClick={onNext}
          disabled={!selected}
        >
          Tiếp theo <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function Step3({
  member,
  pkg,
  data,
  onChange,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  member: MemberFormData
  pkg: Package
  data: PaymentFormData
  onChange: (d: PaymentFormData) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}) {
  function formatPrice(price: string) {
    return Number(price).toLocaleString('vi-VN') + 'đ'
  }

  const needsRef = data.paymentMethod !== 'cash'

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rogym-card rogym-card--compact p-5 space-y-3">
        <h3 className="text-sm font-bold text-white mb-4">Tóm tắt đăng ký</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">Hội viên</div>
            <div className="font-medium text-white">{member.fullName}</div>
            <div className="text-xs rogym-text-dim">{member.email}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">Gói tập</div>
            <div className="font-medium text-white">{pkg.name}</div>
            <div className="text-xs rogym-text-dim">{pkg.durationDays} ngày</div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[rgba(6,195,132,0.25)] bg-[rgba(6,195,132,0.06)] px-4 py-3">
          <span className="rogym-text-secondary font-medium">Tổng thanh toán</span>
          <span className="text-lg font-bold text-[var(--rogym-teal)]">{formatPrice(pkg.price)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="rogym-card rogym-card--compact p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">Phương thức thanh toán</h3>

        <div className="flex gap-3 flex-wrap">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ ...data, paymentMethod: m.value })}
              className={[
                'rogym-card rogym-card--interactive px-4 py-2.5 text-sm font-medium transition-all',
                data.paymentMethod === m.value
                  ? 'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.08)] text-[var(--rogym-teal)]'
                  : 'rogym-text-secondary',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        {needsRef && (
          <label className="block space-y-2">
            <span className="rogym-field-label">Mã giao dịch / tham chiếu</span>
            <input
              className="rogym-input"
              value={data.transactionReference}
              onChange={(e) => onChange({ ...data, transactionReference: e.target.value })}
              placeholder="Nhập mã giao dịch (nếu có)"
            />
          </label>
        )}
      </div>

      {error && <StaffErrorState message={error} />}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack} disabled={submitting}>
          Quay lại
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
        </button>
      </div>
    </div>
  )
}

export default function MemberRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [memberData, setMemberData] = useState<MemberFormData>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    password: '',
    confirmPassword: '',
  })

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    paymentMethod: 'cash',
    transactionReference: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!selectedPackage) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await memberService.createMember({
        fullName: memberData.fullName,
        email: memberData.email,
        phone: memberData.phone || undefined,
        dateOfBirth: memberData.dateOfBirth,
        address: memberData.address || undefined,
        password: memberData.password,
        packageId: Number(selectedPackage.packageId),
        paymentMethod: paymentData.paymentMethod,
        transactionReference: paymentData.transactionReference || undefined,
      })
      navigate('/staff/members', { state: { registeredMember: memberData.fullName } })
    } catch (err) {
      setSubmitError(getApiError(err, 'Không thể đăng ký hội viên. Vui lòng thử lại.'))
      setSubmitting(false)
    }
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Người dùng"
        title="Đăng ký hội viên tại quầy"
        description="Tạo tài khoản và đăng ký gói tập cho hội viên mới đăng ký tại quầy."
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <Step1
          data={memberData}
          onChange={setMemberData}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2
          selected={selectedPackage}
          onSelect={setSelectedPackage}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3
          member={memberData}
          pkg={selectedPackage!}
          data={paymentData}
          onChange={setPaymentData}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </StaffPage>
  )
}
