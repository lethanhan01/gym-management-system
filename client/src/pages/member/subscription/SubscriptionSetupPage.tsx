import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import packageService, { type Package } from '@/services/package.service'
import subscriptionService from '@/services/subscription.service'
import { hasActiveSubscription } from '@/lib/subscription'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import trainerService, { type Trainer } from '@/services/trainer.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { PackagePicker, PackagePickerSkeleton } from '@/components/PackagePicker'


export default function SubscriptionSetupPage() {
  const { t } = useTranslation('member')
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
  const subscriptionStatus = useSubscriptionStore((state) => state.status)
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub)
  const checkedMemberId = useSubscriptionStore((state) => state.checkedMemberId)
  const setResolvedStatus = useSubscriptionStore((state) => state.setResolvedStatus)

  useEffect(() => {
    const memberId = user?.memberId ? String(user.memberId) : null
    if (!memberId) {
      setCheckingSubscription(false)
      return
    }

    setCheckingSubscription(true)

    if (subscriptionStatus === 'success' && checkedMemberId === memberId) {
      if (hasActiveSub === true) {
        navigate('/member', { replace: true })
        return
      }
      setCheckingSubscription(false)
      return
    }

    let cancelled = false
    subscriptionService
      .getByMember(memberId)
      .then((subscriptions) => {
        if (cancelled) return
        const hasCurrentSubscription = hasActiveSubscription(subscriptions)
        setResolvedStatus(hasCurrentSubscription, memberId)
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
      .catch(() => {
        // Stay on setup and allow package selection/retry UI to render.
      })
      .finally(() => {
        if (!cancelled) setCheckingSubscription(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    checkedMemberId,
    hasActiveSub,
    navigate,
    retryCount,
    setResolvedStatus,
    subscriptionStatus,
    user?.memberId,
  ])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)

    packageService
      .list({ status: 'active' })
      .then(({ data }) => {
        if (cancelled) return
        setPackages(data)
        setLoadError(false)
        const defaultPackage = data[2] ?? data[data.length - 1]
        if (defaultPackage) setSelectedId(defaultPackage.packageId)
      })
      .catch(() => {
        if (cancelled) return
        setPackages([])
        setLoadError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retryCount])

  const selectedPackage = packages.find((item) => item.packageId === selectedId) ?? null
  const startDate = new Date()
  const endDate = selectedPackage
    ? new Date(startDate.getTime() + (Number(selectedPackage.durationDays) - 1) * 86_400_000)
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
          eyebrow={t('subscription.setup.trainerEyebrow')}
          title={t('subscription.setup.trainerTitle')}
          description={t('subscription.setup.trainerDescription', { name: selectedPackage?.name ?? '' })}
          actions={
            <button
              type="button"
              onClick={() => setStep('pick-package')}
              className="rogym-btn rogym-btn--outline-white"
            >
              {t('subscription.setup.backToPackages')}
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
              {t('subscription.setup.buttonContinue')}
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
          {t('subscription.setup.mainTitle')}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/50">
          {t('subscription.setup.mainSubtitle')}
        </p>
      </div>
      {loading || checkingSubscription ? (
        <PackagePickerSkeleton />
      ) : loadError ? (
        <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-sm text-red-300">{t('subscription.setup.errorNetwork')}</p>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            onClick={() => { setLoading(true); setLoadError(false); setCheckingSubscription(true); setRetryCount(c => c + 1) }}
          >
            {t('subscription.setup.buttonRetry')}
          </button>
        </div>
      ) : packages.length === 0 ? (
        <div className="rogym-card rogym-card--compact flex items-center justify-center py-16 text-sm rogym-text-secondary">
          {t('subscription.setup.emptyPackages')}
        </div>
      ) : (
        <PackagePicker
          packages={packages}
          selectedId={selectedId}
          onSelect={setSelectedId}
          startDate={startDate}
          endDate={endDate}
          endDateLabel={t('subscription.setup.endDateLabel')}
          onContinue={handleContinue}
        />
      )}
    </MemberPage>
  )
}
