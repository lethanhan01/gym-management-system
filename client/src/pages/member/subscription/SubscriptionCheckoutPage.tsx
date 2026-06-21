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
  Check,
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
  maskPaymentAccountRef,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodOption,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'

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
    <button onClick={onClick} className={`rogym-checkout-method ${selected ? 'is-active' : ''}`}>
      <opt.Icon size={18} />
      {opt.label}
    </button>
  )
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  icon?: React.ReactNode
}) {
  return (
    <div>
      <label className="rogym-sx-908da9f0">{label}</label>
      <div className="rogym-checkout-field rogym-sx-50666a57">
        {icon && <div className="rogym-checkout-field__icon">{icon}</div>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`rogym-checkout-field__input ${icon ? 'has-icon' : ''}`}
        />
      </div>
    </div>
  )
}

export default function SubscriptionCheckoutPage({ mode }: { mode: 'buy' | 'renew' }) {
  const { t } = useTranslation('member')
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as PayState | null

  const { user } = useAuthStore()
  const setResolvedStatus = useSubscriptionStore((state) => state.setResolvedStatus)

  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [provider, setProvider] = useState('')
  const [phoneNo, setPhoneNo] = useState('')
  const [txRef, setTxRef] = useState('')
  const [saveAccount, setSaveAccount] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const endDate = new Date(startDate.getTime() + Number(state.durationDays) * 86400000)
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
    await paymentAccountService.remove(user.memberId, accountId)
    setAccounts((prev) => prev.filter((a) => a.accountId !== accountId))
  }

  async function handleConfirm() {
    if (!user?.memberId) return
    const memberId = user.memberId
    setSubmitting(true)
    setError(null)
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

      // Gia hạn: 1 endpoint atomic (tạo payment + cộng endDate trong cùng transaction).
      // Không gọi paymentService.create riêng — backend không nhận payment cho sub đang active.
      if (mode === 'renew') {
        if (!state?.subscriptionId) {
          setError(t('subscription.checkout.errorRenewNotFound'))
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

      // Mua mới: tạo (hoặc dùng lại) sub pending rồi thanh toán để kích hoạt.
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
        setError(e?.response?.data?.message || t('subscription.checkout.errorGeneric'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rogym-sx-13d95242">
      <button
        onClick={() => navigate(-1)}
        className="rogym-text-link rogym-text-link--accent rogym-sx-dd54bdbf"
      >
        <ArrowLeft size={14} /> {t('subscription.checkout.backLink')}
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">
        {mode === 'renew' ? t('subscription.checkout.titleRenew') : t('subscription.checkout.title')}
      </h1>

      {/* Order summary bar */}
      <div className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between rogym-sx-93eaf0d2">
        <div>
          <p className="rogym-sx-780e0fa6">{mode === 'renew' ? t('subscription.checkout.orderRenew') : t('subscription.checkout.orderBuy')}</p>
          <p className="rogym-sx-668e18f3">{state.packageName}</p>
          <p className="rogym-sx-0c98cdd6">
            {t('subscription.checkout.orderDays', { count: state.durationDays })} &nbsp;·&nbsp; {t('subscription.checkout.orderDateRange', { startDate: fmtDate(startDate), endDate: fmtDate(endDate) })}
          </p>
        </div>
        <p className="rogym-sx-04751e92">{formatVnd(state.price)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card left: payment info */}
        <div className="rounded-2xl p-6 flex flex-col gap-4 rogym-sx-25952519">
          <h3 className="text-base font-bold text-white">{t('subscription.checkout.paymentInfoTitle')}</h3>

          <div className="flex flex-col gap-2">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
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
              <InputField
                label={t('subscription.checkout.fieldBankName')}
                placeholder="Vietcombank, BIDV..."
                value={bankName}
                onChange={setBankName}
                icon={<Landmark size={15} />}
              />
              <InputField
                label={t('subscription.checkout.fieldAccountNo')}
                placeholder="1234567890"
                value={accountNo}
                onChange={setAccountNo}
                icon={<CreditCard size={15} />}
              />
              <InputField
                label={t('subscription.checkout.fieldTxRef')}
                placeholder="REF-..."
                value={txRef}
                onChange={setTxRef}
                icon={<Hash size={15} />}
              />
            </div>
          )}

          {method === 'ewallet' && (
            <div className="flex flex-col gap-3">
              <InputField
                label={t('subscription.checkout.fieldWallet')}
                placeholder="MoMo, ZaloPay, VNPay..."
                value={provider}
                onChange={setProvider}
                icon={<WalletCards size={15} />}
              />
              <InputField
                label={t('subscription.checkout.fieldPhone')}
                placeholder="0912 345 678"
                value={phoneNo}
                onChange={setPhoneNo}
                icon={<Phone size={15} />}
              />
              <InputField
                label={t('subscription.checkout.fieldTxRef')}
                placeholder="REF-..."
                value={txRef}
                onChange={setTxRef}
                icon={<Hash size={15} />}
              />
            </div>
          )}

          {method !== 'cash' && (
            <label className="rogym-sx-8cd06ff5">
              <div
                onClick={() => setSaveAccount((v) => !v)}
                className={`rogym-checkbox ${saveAccount ? 'is-checked' : ''}`}
              >
                {saveAccount && <Check size={11} className="rogym-sx-b2fbf853" />}
              </div>
              <span className="rogym-sx-c2ff5e7f">{t('subscription.checkout.checkboxSave')}</span>
            </label>
          )}

          {error && <p className="rogym-sx-fff6a280">{error}</p>}

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="rogym-btn rogym-btn--primary rogym-btn--wide mt-auto"
          >
            {submitting
              ? t('subscription.checkout.buttonProcessing')
              : t(
                  mode === 'renew'
                    ? 'subscription.checkout.buttonConfirmRenew'
                    : 'subscription.checkout.buttonConfirmPay',
                  { price: formatVnd(state.price) }
                )}
          </button>
        </div>

        {/* Card right: saved accounts */}
        <div className="rounded-2xl p-6 flex flex-col gap-3 rogym-sx-25952519">
          <h3 className="text-base font-bold text-white">{t('subscription.checkout.savedAccountsTitle')}</h3>
          <p className="rogym-sx-61bc6441">{t('subscription.checkout.savedAccountsHint')}</p>

          {accountsLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-xl rogym-sx-38664d25" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 rogym-sx-ee3d55bf">
              <WalletCards size={36} className="rogym-sx-1c327a5d" />
              <p className="rogym-sx-0ea5ff5a">{t('subscription.checkout.noSavedAccounts')}</p>
              <p className="rogym-sx-78d149e3">
                {t('subscription.checkout.noSavedAccountsHint')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((acc) => (
                <div key={acc.accountId} className="rogym-sx-ad669c58">
                  <button onClick={() => fillFromAccount(acc)} className="rogym-sx-00ca7311">
                    <div className="rogym-sx-52a21cf8">
                      <PaymentMethodIcon method={acc.type} size={15} />
                    </div>
                    <div className="rogym-sx-15fa32ae">
                      <div className="rogym-sx-ce4a3a96">
                        <p className="rogym-sx-3cb875af">
                          {acc.label || acc.provider || getPaymentMethodLabel(acc.type)}
                        </p>
                        {acc.isDefault && <span className="rogym-sx-8abe74be">{t('subscription.checkout.defaultBadge')}</span>}
                      </div>
                      {acc.accountRef && (
                        <p className="rogym-sx-8c2d1cde">{maskPaymentAccountRef(acc.accountRef)}</p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.accountId)}
                    className="rogym-sx-07caf3f9"
                    title={t('subscription.checkout.buttonDeleteAccount')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
