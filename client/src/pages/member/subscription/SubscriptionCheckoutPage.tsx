import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CreditCard,
  ArrowLeft,
  Landmark,
  Phone,
  WalletCards,
  Trash2,
  Hash,
} from 'lucide-react'
import paymentService, { type PaymentMethod } from '@/services/payment.service'
import paymentAccountService, { type PaymentAccount } from '@/services/paymentAccount.service'
import subscriptionService from '@/services/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { formatVnd } from '@/lib/currency'
import {
  getPaymentMethodLabel,
  getPaymentMethodOptions,
  maskPaymentAccountRef,
  type PaymentMethodOption,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  FormField,
  Input,
  Page,
  PageEmptyState,
  PageHeader,
  PageSkeleton,
} from '@/components/ui'
import { toast } from '@/lib/toast'

interface PayState {
  packageId: string
  packageName: string
  price: number
  durationDays: number
  trainerId?: string | null
  subscriptionId?: string
}

function MethodBtn({
  opt,
  selected,
  onClick,
}: {
  opt: PaymentMethodOption
  selected: boolean
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={`rogym-checkout-method ${selected ? 'is-active' : ''}`}>
      <opt.Icon size={18} />
      {opt.label}
    </button>
  )
}

export default function SubscriptionCheckoutPage({ mode }: { mode: 'buy' | 'renew' }) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as PayState | null

  const user = useAuthStore(state => state.user)
  const setResolvedStatus = useSubscriptionStore((state) => state.setResolvedStatus)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [provider, setProvider] = useState('')
  const [phoneNo, setPhoneNo] = useState('')
  const [txRef, setTxRef] = useState('')
  const [saveAccount, setSaveAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [accounts, setAccounts] = useState<PaymentAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)

  useEffect(() => {
    const invalidRenewal = mode === 'renew' && !state?.subscriptionId
    if (!state?.packageId || invalidRenewal) {
      navigate(mode === 'renew' ? '/member/subscription/renew' : '/member/subscription/setup', {
        replace: true,
      })
    }
  }, [mode, navigate, state])

  useEffect(() => {
    if (!user?.memberId) return
    paymentAccountService
      .list(user.memberId)
      .then((accts) => {
        setAccounts(accts)
        const def = accts.find((a) => a.isDefault)
        if (def) {
          setMethod(def.type)
          if (def.type === 'bank_card') {
            setBankName(def.provider ?? '')
            setAccountNo(def.accountRef ?? '')
          } else if (def.type === 'ewallet') {
            setProvider(def.provider ?? '')
            setPhoneNo(def.accountRef ?? '')
          }
        }
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false))
  }, [user?.memberId])

  if (!state) return null

  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + (Number(state.durationDays) - 1) * 86400000)
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  function fillFromAccount(acc: PaymentAccount) {
    setMethod(acc.type)
    if (acc.type === 'bank_card') {
      setBankName(acc.provider ?? '')
      setAccountNo(acc.accountRef ?? '')
    } else if (acc.type === 'ewallet') {
      setProvider(acc.provider ?? '')
      setPhoneNo(acc.accountRef ?? '')
    }
  }

  async function handleDeleteAccount(accountId: number) {
    if (!user?.memberId) return
    try {
      await paymentAccountService.remove(user.memberId, accountId)
      setAccounts((prev) => prev.filter((a) => a.accountId !== accountId))
      toast.success(t('subscription.checkout.success.deletedAccount', { defaultValue: 'Đã xóa tài khoản thanh toán' }))
    } catch {
      toast.error(t('subscription.checkout.error.deleteAccount', { defaultValue: 'Xóa tài khoản thất bại' }))
    }
  }

  async function handleConfirm() {
    if (!user?.memberId) return
    const memberId = user.memberId
    setSubmitting(true)
    try {
      const saveAccountIfNeeded = async () => {
        if (saveAccount && method !== 'cash') {
          await paymentAccountService
            .create(memberId, {
              type: method,
              provider: method === 'bank_card' ? bankName : provider,
              accountRef: method === 'bank_card' ? accountNo : phoneNo,
            })
            .catch(() => {})
        }
      }

      // Gia hạn: 1 endpoint atomic
      if (mode === 'renew') {
        if (!state?.subscriptionId) {
          toast.error(t('subscription.checkout.errorRenewNotFound'))
          return
        }
        await subscriptionService.renew(state.subscriptionId, {
          method,
          ...(txRef.trim() ? { transactionReference: txRef.trim() } : {}),
        })
        await saveAccountIfNeeded()
        navigate('/member/subscription/current', { state: { justActivated: true }, replace: true })
        return
      }

      // Mua mới
      let subId: number
      if (state!.subscriptionId) {
        subId = Number(state!.subscriptionId)
      } else {
        try {
          const sub = await subscriptionService.create(
            user.memberId,
            state!.packageId,
            state!.trainerId ?? undefined
          )
          subId = Number(sub.subscriptionId)
        } catch (subErr) {
          const e = subErr as { response?: { status?: number; data?: { code?: string } } }
          if (
            e?.response?.status === 409 &&
            e?.response?.data?.code === 'SUBSCRIPTION_ALREADY_EXISTS'
          ) {
            const subs = await subscriptionService.getByMember(user.memberId)
            const pending = subs.find((s) => s.status === 'pending')
            if (!pending) throw subErr
            subId = Number(pending.subscriptionId)
          } else {
            throw subErr
          }
        }
      }
      await paymentService.create({
        memberId: Number(user.memberId),
        subscriptionId: subId,
        method,
        amount: state!.price,
        ...(txRef.trim() ? { transactionReference: txRef.trim() } : {}),
      })
      await saveAccountIfNeeded()
      setResolvedStatus(true, user.memberId)
      navigate('/member', { replace: true })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      if (mode === 'renew' && e?.response?.status === 401) {
        navigate('/login')
      } else {
        toast.error(e?.response?.data?.message || t('subscription.checkout.errorGeneric'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Thanh toán"
        title={mode === 'renew' ? t('subscription.checkout.titleRenew') : t('subscription.checkout.title')}
        actions={
          <Button
            variant="outline-white"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft size={14} />}
          >
            {t('subscription.checkout.backLink')}
          </Button>
        }
      />

      {/* Order summary bar */}
      <Card as="section" variant="compact" className="px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="rogym-sx-780e0fa6">{mode === 'renew' ? t('subscription.checkout.orderRenew') : t('subscription.checkout.orderBuy')}</p>
          <p className="rogym-sx-668e18f3">{state.packageName}</p>
          <p className="rogym-sx-0c98cdd6">
            {t('subscription.checkout.orderDays', { count: state.durationDays })} &nbsp;·&nbsp; {t('subscription.checkout.orderDateRange', { startDate: fmtDate(startDate), endDate: fmtDate(endDate) })}
          </p>
        </div>
        <p className="rogym-sx-04751e92">{formatVnd(state.price)}</p>
      </Card>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card left: payment info */}
        <Card as="article" variant="compact" className="p-6 flex flex-col gap-4">
          <h3 className="text-base font-bold text-white">{t('subscription.checkout.paymentInfoTitle')}</h3>

          <div className="flex flex-col gap-2">
            {getPaymentMethodOptions().map((opt) => (
              <MethodBtn
                key={opt.value}
                opt={opt}
                selected={method === opt.value}
                onClick={() => setMethod(opt.value)}
              />
            ))}
          </div>

          {method === 'bank_card' && (
            <div className="flex flex-col gap-3">
              <FormField label={t('subscription.checkout.fieldBankName')}>
                <Input
                  placeholder="Vietcombank, BIDV..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  leftIcon={<Landmark size={15} />}
                />
              </FormField>
              <FormField label={t('subscription.checkout.fieldAccountNo')}>
                <Input
                  placeholder="1234567890"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  leftIcon={<CreditCard size={15} />}
                />
              </FormField>
              <FormField label={t('subscription.checkout.fieldTxRef')}>
                <Input
                  placeholder="REF-..."
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  leftIcon={<Hash size={15} />}
                />
              </FormField>
            </div>
          )}

          {method === 'ewallet' && (
            <div className="flex flex-col gap-3">
              <FormField label={t('subscription.checkout.fieldWallet')}>
                <Input
                  placeholder="MoMo, ZaloPay, VNPay..."
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  leftIcon={<WalletCards size={15} />}
                />
              </FormField>
              <FormField label={t('subscription.checkout.fieldPhone')}>
                <Input
                  placeholder="0912 345 678"
                  value={phoneNo}
                  onChange={(e) => setPhoneNo(e.target.value)}
                  leftIcon={<Phone size={15} />}
                />
              </FormField>
              <FormField label={t('subscription.checkout.fieldTxRef')}>
                <Input
                  placeholder="REF-..."
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  leftIcon={<Hash size={15} />}
                />
              </FormField>
            </div>
          )}

          {method !== 'cash' && (
            <Checkbox
              checked={saveAccount}
              onChange={(e) => setSaveAccount(e.target.checked)}
              label={t('subscription.checkout.checkboxSave')}
            />
          )}

          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            disabled={submitting}
            loading={submitting}
            className="mt-auto"
          >
            {mode === 'renew'
              ? t('subscription.checkout.buttonConfirmRenew')
              : t('subscription.checkout.buttonConfirmPay', { price: formatVnd(state.price) })}
          </Button>
        </Card>

        {/* Card right: saved accounts */}
        <Card as="aside" variant="compact" className="p-6 flex flex-col gap-3">
          <h3 className="text-base font-bold text-white">{t('subscription.checkout.savedAccountsTitle')}</h3>
          <p className="rogym-sx-61bc6441">{t('subscription.checkout.savedAccountsHint')}</p>

          {accountsLoading ? (
            <PageSkeleton rows={2} />
          ) : accounts.length === 0 ? (
            <PageEmptyState
              title={t('subscription.checkout.noSavedAccounts')}
              description={t('subscription.checkout.noSavedAccountsHint')}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((acc) => (
                <div key={acc.accountId} className="rogym-sx-ad669c58">
                  <button type="button" onClick={() => fillFromAccount(acc)} className="rogym-sx-00ca7311">
                    <div className="rogym-sx-52a21cf8">
                      <PaymentMethodIcon method={acc.type} size={15} />
                    </div>
                    <div className="rogym-sx-15fa32ae">
                      <div className="rogym-sx-ce4a3a96">
                        <p className="rogym-sx-3cb875af">
                          {acc.label || acc.provider || getPaymentMethodLabel(acc.type)}
                        </p>
                        {acc.isDefault && (
                          <Badge tone="success" size="xs">
                            {t('subscription.checkout.defaultBadge')}
                          </Badge>
                        )}
                      </div>
                      {acc.accountRef && (
                        <p className="rogym-sx-8c2d1cde">{maskPaymentAccountRef(acc.accountRef)}</p>
                      )}
                    </div>
                  </button>
                  <Button
                    variant="icon"
                    size="sm"
                    onClick={() => handleDeleteAccount(acc.accountId)}
                    className="rogym-sx-07caf3f9"
                    title={t('subscription.checkout.buttonDeleteAccount')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </Page>
  )
}

