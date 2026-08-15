import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Dumbbell, User, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { memberService } from '@/services/member.service'
import packageService, { type Package } from '@/services/package.service'
import {
  Page,
  PageHeader,
  PageSkeleton,
  PageErrorState,
  Card,
  FormField,
  Input,
  DatePickerInput,
  Button,
  Badge,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

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
    <div className="mb-8 flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = current > s.n
        const active = current === s.n
        return (
          <div key={s.n} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors',
                  done
                    ? 'bg-[var(--rogym-green)] text-white'
                    : active
                      ? 'border-2 border-[var(--rogym-teal)] bg-transparent text-[var(--rogym-teal)]'
                      : 'border border-white/20 bg-transparent rogym-text-dim'
                )}
              >
                {done ? <Check size={16} strokeWidth={2.5} /> : s.n}
              </div>
              <span
                className={cn(
                  'whitespace-nowrap text-xs font-medium',
                  active ? 'text-[var(--rogym-teal)]' : done ? 'rogym-text-secondary' : 'rogym-text-dim'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-3 mb-5 h-px flex-1',
                  done ? 'bg-[var(--rogym-green)]' : 'bg-white/10'
                )}
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
    const phone = data.phone.replace(/[.\s()-]/g, '')
    if (!/^(?:0\d{9}|\+84\d{9})$/.test(phone)) {
      setError('Số điện thoại không hợp lệ')
      return
    }
    const birth = new Date(`${data.dateOfBirth}T00:00:00`)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    )
      age--
    if (!data.dateOfBirth || Number.isNaN(birth.getTime()) || age < 14 || age > 120) {
      setError('Ngày sinh phải tương ứng tuổi từ 14 đến 120')
      return
    }
    setError(null)
    onNext()
  }

  return (
    <form onSubmit={handleNext} className="space-y-4">
      {error && <PageErrorState message={error} />}

      <Card variant="compact" className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label={t('members.register.fullName')} required>
            <Input
              value={data.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              required
            />
          </FormField>

          <FormField label={t('members.register.email')} required>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="email@example.com"
              required
            />
          </FormField>

          <FormField label={t('members.register.phone')} required>
            <Input
              type="tel"
              value={data.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="0901 234 567"
              required
            />
          </FormField>

          <FormField label={t('members.register.dateOfBirth')} required>
            <DatePickerInput
              value={data.dateOfBirth}
              onChange={(v) => set('dateOfBirth', v)}
              max={new Date().toISOString().split('T')[0]}
              required
              aria-label={t('members.register.dateOfBirth')}
            />
          </FormField>

          <FormField label={t('members.register.address')} className="col-span-full">
            <Input
              value={data.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder={t('members.register.addressPlaceholder')}
            />
          </FormField>

          <FormField label={t('members.register.password')} required>
            <Input
              type="password"
              showPasswordToggle
              value={data.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={t('members.register.passwordPlaceholder')}
              minLength={8}
              required
            />
          </FormField>

          <FormField label={t('members.register.confirmPassword')} required>
            <Input
              type="password"
              showPasswordToggle
              value={data.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder={t('members.register.confirmPasswordPlaceholder')}
              required
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" className="flex items-center gap-2">
          {t('members.register.next')} <ChevronRight size={16} />
        </Button>
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
        <PageSkeleton rows={3} />
      ) : error ? (
        <PageErrorState message={error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isSelected = selected?.packageId === pkg.packageId
            return (
              <Card
                key={pkg.packageId}
                variant="interactive"
                onClick={() => onSelect(pkg)}
                className={cn(
                  isSelected &&
                    'border-[var(--rogym-green)] bg-[rgba(6,195,132,0.08)] ring-1 ring-[var(--rogym-green)]'
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-bold text-white">{pkg.name}</h3>
                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--rogym-green)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="rogym-text-dim">{t('members.register.duration')}</span>
                    <span className="font-medium rogym-text-secondary">
                      {t('members.register.durationDays', { days: pkg.durationDays })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="rogym-text-dim">{t('members.register.price')}</span>
                    <span className="font-bold text-[var(--rogym-teal)]">{formatPrice(pkg.price)}</span>
                  </div>
                  {pkg.includesPt && (
                    <div className="mt-2">
                      <Badge tone="accent" badgeSize="sm">
                        {t('members.register.includesPt')}
                      </Badge>
                    </div>
                  )}
                </div>

                {pkg.benefits && (
                  <p className="mt-3 border-t border-white/5 pt-3 text-xs rogym-text-dim">
                    {pkg.benefits}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline-white" onClick={onBack}>
          {t('members.register.back')}
        </Button>
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={onNext}
          disabled={!selected}
        >
          {t('members.register.next')} <ChevronRight size={16} />
        </Button>
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
}: {
  member: MemberFormData
  pkg: Package
  data: PaymentFormData
  onChange: (d: PaymentFormData) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
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
      <Card variant="compact" className="space-y-3 p-5">
        <h3 className="mb-4 text-sm font-bold text-white">{t('members.register.summarySectionTitle')}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="mb-1 text-xs rogym-text-dim">{t('members.register.summaryMember')}</div>
            <div className="font-medium text-white">{member.fullName}</div>
            <div className="text-xs rogym-text-dim">{member.email}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <div className="mb-1 text-xs rogym-text-dim">{t('members.register.summaryPackage')}</div>
            <div className="font-medium text-white">{pkg.name}</div>
            <div className="text-xs rogym-text-dim">
              {t('members.register.durationDays', { days: pkg.durationDays })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[rgba(6,195,132,0.25)] bg-[rgba(6,195,132,0.06)] px-4 py-3">
          <span className="font-medium rogym-text-secondary">{t('members.register.totalPayment')}</span>
          <span className="text-lg font-bold text-[var(--rogym-teal)]">{formatPrice(pkg.price)}</span>
        </div>
      </Card>

      {/* Payment method */}
      <Card variant="compact" className="space-y-4 p-5">
        <h3 className="text-sm font-bold text-white">{t('members.register.paymentMethod')}</h3>

        <div className="flex flex-wrap gap-3">
          {PAYMENT_METHODS.map((m) => (
            <Button
              key={m.value}
              type="button"
              variant={data.paymentMethod === m.value ? 'primary' : 'outline-white'}
              size="compact"
              onClick={() => onChange({ ...data, paymentMethod: m.value })}
            >
              {m.label}
            </Button>
          ))}
        </div>

        {needsRef && (
          <FormField label={t('members.register.transactionRef')}>
            <Input
              value={data.transactionReference}
              onChange={(e) => onChange({ ...data, transactionReference: e.target.value })}
              placeholder={t('members.register.transactionRefPlaceholder')}
            />
          </FormField>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline-white" onClick={onBack} disabled={submitting}>
          {t('members.register.back')}
        </Button>
        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={onSubmit}
          loading={submitting}
        >
          {submitting ? t('members.register.processing') : t('members.register.complete')}
        </Button>
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

  async function handleSubmit() {
    if (!selectedPackage) return
    setSubmitting(true)
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
      toast.success(t('members.register.success', { defaultValue: 'Đăng ký hội viên thành công' }))
      navigate('/staff/members', { state: { registeredMember: memberData.fullName } })
    } catch (err) {
      toast.error(getApiError(err, t('members.register.submitFailed')), {
        action: { label: t('members.register.retry', { defaultValue: 'Thử lại' }), onClick: handleSubmit },
      })
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <PageHeader
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
        />
      )}
    </Page>
  )
}
