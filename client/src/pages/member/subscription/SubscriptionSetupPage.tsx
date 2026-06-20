import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import trainerService, { type Trainer } from '@/services/trainer.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { PackagePicker, PackagePickerSkeleton } from '@/components/PackagePicker'


export default function SubscriptionSetupPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [step, setStep] = useState<'pick-package' | 'pick-trainer'>('pick-package')
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainersLoading, setTrainersLoading] = useState(false)
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.memberId) {
      setCheckingSubscription(false)
      return
    }
    subscriptionService
      .getByMember(user.memberId)
      .then((subscriptions) => {
        const now = Date.now()
        const hasCurrentSubscription = subscriptions.some(
          (item) => item.status === 'active' && new Date(item.endDate).getTime() >= now
        )
        if (hasCurrentSubscription) {
          navigate('/member', { replace: true })
          return
        }
        const pendingSub = subscriptions.find((item) => item.status === 'pending')
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
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSubscription(false))
    packageService
      .list({ status: 'active' })
      .then(({ data }) => {
        setPackages(data)
        setLoadError(false)
        const defaultPackage = data[2] ?? data[data.length - 1]
        if (defaultPackage) setSelectedId(defaultPackage.packageId)
      })
      .catch(() => { setPackages([]); setLoadError(true) })
      .finally(() => setLoading(false))
  }, [navigate, user?.memberId, retryCount])

  const selectedPackage = packages.find((item) => item.packageId === selectedId) ?? null
  const startDate = new Date()
  const endDate = selectedPackage
    ? new Date(startDate.getTime() + Number(selectedPackage.durationDays) * 86_400_000)
    : null

  async function handleContinue() {
    if (!selectedPackage) return
    if (selectedPackage.includesPt) {
      setStep('pick-trainer')
      if (trainers.length === 0) {
        setTrainersLoading(true)
        try {
          setTrainers(await trainerService.list())
        } catch {
          proceedToPayment(undefined)
        } finally {
          setTrainersLoading(false)
        }
      }
    } else {
      proceedToPayment(undefined)
    }
  }

  function proceedToPayment(trainerId: string | undefined) {
    if (!selectedPackage) return
    navigate('/member/subscription/buy/payment', {
      state: {
        packageId: selectedPackage.packageId,
        packageName: selectedPackage.name,
        price: Number(selectedPackage.price),
        durationDays: Number(selectedPackage.durationDays),
        trainerId: trainerId ?? null,
      },
    })
  }

  if (step === 'pick-trainer') {
    return (
      <MemberPage>
        <MemberPageHeader
          eyebrow="Gói tập"
          title="Chọn huấn luyện viên"
          description={`Gói "${selectedPackage?.name ?? ''}" bao gồm PT. Chọn huấn luyện viên bạn muốn.`}
          actions={
            <button
              type="button"
              onClick={() => setStep('pick-package')}
              className="rogym-btn rogym-btn--outline-white"
            >
              ← Chọn lại gói
            </button>
          }
        />
        {trainersLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent border-[var(--rogym-teal)]" />
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-3">
            {trainers.map((t) => (
              <button
                key={t.staffId}
                type="button"
                onClick={() => setSelectedTrainerId((id) => (id === t.staffId ? '' : t.staffId))}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-colors ${
                  selectedTrainerId === t.staffId
                    ? 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/10'
                    : 'rogym-card rogym-card--compact border-white/10'
                }`}
              >
                <p className="text-sm font-semibold text-white">{t.fullName}</p>
                <p className="mt-0.5 text-xs capitalize rogym-text-secondary">{t.position}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => selectedTrainerId && proceedToPayment(selectedTrainerId)}
              disabled={!selectedTrainerId}
              className="rogym-btn rogym-btn--primary mt-2 w-full disabled:opacity-40"
            >
              Tiếp tục thanh toán
            </button>
          </div>
        )}
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      <div className="text-center">
        <h1 className="font-anton text-[clamp(1.5rem,3vw,2.5rem)] leading-tight tracking-wide text-white">
          Chọn gói tập phù hợp với bạn
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/50">
          Cuộn để khám phá các gói tập đang có. Mỗi gói được thiết kế để phù hợp với từng mục tiêu và lịch trình khác nhau của bạn.
        </p>
      </div>
      {loading || checkingSubscription ? (
        <PackagePickerSkeleton />
      ) : loadError ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-sm text-red-300">Không thể kết nối đến máy chủ. Vui lòng thử lại.</p>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => { setLoading(true); setLoadError(false); setCheckingSubscription(true); setRetryCount(c => c + 1) }}
          >
            Thử lại
          </button>
        </div>
      ) : packages.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex items-center justify-center py-16 text-sm rogym-text-secondary">
          Hiện tại chưa có gói tập nào khả dụng. Vui lòng liên hệ gym.
        </div>
      ) : (
        <PackagePicker
          packages={packages}
          selectedId={selectedId}
          onSelect={setSelectedId}
          startDate={startDate}
          endDate={endDate}
          endDateLabel="Hết hạn dự kiến"
          onContinue={handleContinue}
        />
      )}
    </MemberPage>
  )
}
