import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Dumbbell, User, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

function StepIndicator({ current }: { current: number }) {
  const { t } = useTranslation('staff')

  const STEPS = [
    { n: 1, label: t('members.register.step1Label'), icon: User },
    { n: 2, label: t('members.register.step2Label'), icon: Dumbbell },
    { n: 3, label: t('members.register.step3Label'), icon: CreditCard },
  ]

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
  const { t } = useTranslation('staff')
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof MemberFormData, value: string) {
    onChange({ ...data, [field]: value })
  }

  function handleNext(e: FormEvent) {
    e.preventDefault()
    if (data.password.length < 8) {
      setError(t('members.register.passwordMinLength'))
      return
    }
    if (data.password !== data.confirmPassword) {
      setError(t('members.register.passwordMismatch'))
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
            <span className="rogym-field-label">{t('members.register.fullName')}</span>
            <input
              className="rogym-input"
              value={data.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">{t('members.register.email')}</span>
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
            <span className="rogym-field-label">{t('members.register.phone')}</span>
            <input
              type="tel"
              className="rogym-input"
              value={data.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0901 234 567"
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">{t('members.register.dateOfBirth')}</span>
            <DatePickerInput
              value={data.dateOfBirth}
              onChange={(v) => set('dateOfBirth', v)}
              max={new Date().toISOString().split('T')[0]}
              aria-label={t('members.register.dateOfBirth')}
            />
          </label>

          <label className="col-span-full block space-y-2">
            <span className="rogym-field-label">{t('members.register.address')}</span>
            <input
              className="rogym-input"
              value={data.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder={t('members.register.addressPlaceholder')}
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">{t('members.register.password')}</span>
            <input
              type="password"
              className="rogym-input"
              value={data.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={t('members.register.passwordPlaceholder')}
              minLength={8}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">{t('members.register.confirmPassword')}</span>
            <input
              type="password"
              className="rogym-input"
              value={data.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder={t('members.register.confirmPasswordPlaceholder')}
              required
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="rogym-btn rogym-btn--primary flex items-center gap-2">
          {t('members.register.next')} <ChevronRight size={16} />
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
  const { t } = useTranslation('staff')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    packageService
      .list({ status: 'active', pageSize: 50 })
      .then((res) => setPackages(res.data))
      .catch(() => setError(t('members.register.loadPackagesFailed')))
      .finally(() => setLoading(false))
  }, [t])

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
                    <span className="rogym-text-dim">{t('members.register.duration')}</span>
                    <span className="rogym-text-secondary font-medium">
                      {t('members.register.durationDays', { days: pkg.durationDays })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="rogym-text-dim">{t('members.register.price')}</span>
                    <span className="text-[var(--rogym-teal)] font-bold">{formatPrice(pkg.price)}</span>
                  </div>
                  {pkg.includesPt && (
                    <div className="mt-2">
                      <span className="rogym-tone-badge" data-tone="info">
                        {t('members.register.includesPt')}
                      </span>
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
          {t('members.register.back')}
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          onClick={onNext}
          disabled={!selected}
        >
          {t('members.register.next')} <ChevronRight size={16} />
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
  const { t } = useTranslation('staff')

  const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: t('members.register.cash') },
    { value: 'bank_card', label: t('members.register.bankCard') },
    { value: 'ewallet', label: t('members.register.ewallet') },
  ]

  function formatPrice(price: string) {
    return Number(price).toLocaleString('vi-VN') + 'đ'
  }

  const needsRef = data.paymentMethod !== 'cash'

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rogym-card rogym-card--compact p-5 space-y-3">
        <h3 className="text-sm font-bold text-white mb-4">{t('members.register.summarySectionTitle')}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">{t('members.register.summaryMember')}</div>
            <div className="font-medium text-white">{member.fullName}</div>
            <div className="text-xs rogym-text-dim">{member.email}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="text-xs rogym-text-dim mb-1">{t('members.register.summaryPackage')}</div>
            <div className="font-medium text-white">{pkg.name}</div>
            <div className="text-xs rogym-text-dim">
              {t('members.register.durationDays', { days: pkg.durationDays })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[rgba(6,195,132,0.25)] bg-[rgba(6,195,132,0.06)] px-4 py-3">
          <span className="rogym-text-secondary font-medium">{t('members.register.totalPayment')}</span>
          <span className="text-lg font-bold text-[var(--rogym-teal)]">{formatPrice(pkg.price)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="rogym-card rogym-card--compact p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">{t('members.register.paymentMethod')}</h3>

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
            <span className="rogym-field-label">{t('members.register.transactionRef')}</span>
            <input
              className="rogym-input"
              value={data.transactionReference}
              onChange={(e) => onChange({ ...data, transactionReference: e.target.value })}
              placeholder={t('members.register.transactionRefPlaceholder')}
            />
          </label>
        )}
      </div>

      {error && <StaffErrorState message={error} />}

      <div className="flex justify-between">
        <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onBack} disabled={submitting}>
          {t('members.register.back')}
        </button>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary flex items-center gap-2"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? t('members.register.processing') : t('members.register.complete')}
        </button>
      </div>
    </div>
  )
}

export default function MemberRegisterPage() {
  const { t } = useTranslation('staff')
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
      setSubmitError(getApiError(err, t('members.register.submitFailed')))
      setSubmitting(false)
    }
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('members.register.eyebrow')}
        title={t('members.register.title')}
        description={t('members.register.description')}
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
