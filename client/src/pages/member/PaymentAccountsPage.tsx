import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Star } from 'lucide-react'
import { Button, Checkbox, FormField, Input } from '@/components/ui'
import paymentAccountService, { type PaymentAccount, type CreatePaymentAccountPayload } from '@/services/paymentAccount.service'
import { type PaymentMethod } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import {
  MemberBadge,
  MemberCard,
  MemberEmptyState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '@/components/MemberUI'
import {
  getPaymentMethodLabel,
  getPaymentMethodOptions,
  maskPaymentAccountRef,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'

export default function PaymentAccountsPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore(state => state.user)

  const [accounts, setAccounts]   = useState<PaymentAccount[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const [type, setType]             = useState<PaymentMethod>('bank_card')
  const [provider, setProvider]     = useState('')
  const [accountRef, setAccountRef] = useState('')
  const [label, setLabel]           = useState('')
  const [isDefault, setIsDefault]   = useState(false)

  useEffect(() => {
    if (!user?.memberId) return
    paymentAccountService.list(user.memberId)
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [user?.memberId])

  function resetForm() {
    setType('bank_card')
    setProvider('')
    setAccountRef('')
    setLabel('')
    setIsDefault(false)
    setFormError(null)
  }

  async function handleSave() {
    if (!user?.memberId) return
    const payload: CreatePaymentAccountPayload = { type, isDefault }
    if (type === 'bank_card') { payload.provider = provider; payload.accountRef = accountRef }
    if (type === 'ewallet')   { payload.provider = provider; payload.accountRef = accountRef }
    if (label.trim()) payload.label = label.trim()

    setSaving(true)
    setFormError(null)
    setFormSuccess(false)
    try {
      const created = await paymentAccountService.create(user.memberId, payload)
      if (isDefault) {
        setAccounts(prev => [created, ...prev.map(a => ({ ...a, isDefault: false }))])
      } else {
        setAccounts(prev => [...prev, created])
      }
      resetForm()
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 3000)
    } catch {
      setFormError(t('paymentAccounts.submitError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(accountId: number) {
    if (!user?.memberId) return
    await paymentAccountService.remove(user.memberId, accountId)
    setAccounts(prev => prev.filter(a => a.accountId !== accountId))
  }

  function handleSetDefault(accountId: number) {
    if (!user?.memberId) return
    setAccounts(prev => prev.map(a => ({ ...a, isDefault: a.accountId === accountId })))
    paymentAccountService.setDefault(user.memberId, accountId).catch(() => {})
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('paymentAccounts.eyebrow')}
        title={t('paymentAccounts.title')}
        description={t('paymentAccounts.description')}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── LEFT: accounts list ── */}
        <div>
          {loading ? (
            <MemberSkeleton rows={3} />
          ) : accounts.length === 0 ? (
            <MemberEmptyState
              title={t('paymentAccounts.emptyTitle')}
              description={t('paymentAccounts.emptyDescription')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {accounts.map(acc => (
                <MemberCard
                  key={acc.accountId}
                  variant="compact"
                  className={`rogym-payment-account px-5 py-4 flex items-center gap-4 ${
                    acc.isDefault ? 'is-default' : ''
                  }`}
                >
                  <div className="rogym-sx-52a21cf8">
                    <PaymentMethodIcon method={acc.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {acc.label || acc.provider || getPaymentMethodLabel(acc.type)}
                      </p>
                      {acc.isDefault && (
                        <MemberBadge
                          tone="success"
                          size="xs"
                          leftIcon={<Star size={9} fill="currentColor" />}
                        >
                          {t('paymentAccounts.defaultBadge')}
                        </MemberBadge>
                      )}
                    </div>
                    <p className="text-xs rogym-text-secondary mt-0.5">
                      {getPaymentMethodLabel(acc.type)}
                      {acc.provider && acc.provider !== acc.label ? ` · ${acc.provider}` : ''}
                      {acc.accountRef ? ` · ${maskPaymentAccountRef(acc.accountRef)}` : ''}
                    </p>
                  </div>

                  {!acc.isDefault && (
                    <Button
                      variant="icon"
                      onClick={() => handleSetDefault(acc.accountId)}
                      title={t('paymentAccounts.buttonSetDefault')}
                      className="rogym-account-action is-default-action rogym-sx-8ae812d4"
                    >
                      <Star size={15} />
                    </Button>
                  )}

                  <Button
                    variant="icon"
                    onClick={() => handleDelete(acc.accountId)}
                    title={t('paymentAccounts.buttonDelete')}
                    className="rogym-account-action is-delete-action rogym-sx-81543379"
                  >
                    <Trash2 size={15} />
                  </Button>
                </MemberCard>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: quick add card ── */}
        <MemberCard variant="compact" className="p-6 flex flex-col gap-4 xl:self-start">
          <h3 className="text-base font-bold text-white">
            {t('paymentAccounts.formTitle')}
          </h3>

          {/* Type selector */}
          <div className="flex gap-2">
            {getPaymentMethodOptions().map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`rogym-payment-method-option flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all ${
                  type === opt.value ? 'is-active' : ''
                }`}
              >
                <opt.Icon size={16} />{opt.label}
              </button>
            ))}
          </div>

          {type === 'bank_card' && (
            <>
              <FormField label={t('paymentAccounts.fieldBankName')}>
                <Input
                  placeholder="Vietcombank, BIDV, Techcombank..."
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                />
              </FormField>
              <FormField label={t('paymentAccounts.fieldAccountNo')}>
                <Input
                  placeholder="1234567890"
                  value={accountRef}
                  onChange={e => setAccountRef(e.target.value)}
                />
              </FormField>
            </>
          )}
          {type === 'ewallet' && (
            <>
              <FormField label={t('paymentAccounts.fieldWallet')}>
                <Input
                  placeholder="MoMo, ZaloPay, VNPay..."
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                />
              </FormField>
              <FormField label={t('paymentAccounts.fieldPhone')}>
                <Input
                  placeholder="0912 345 678"
                  value={accountRef}
                  onChange={e => setAccountRef(e.target.value)}
                />
              </FormField>
            </>
          )}

          <FormField label={t('paymentAccounts.fieldDisplayName')}>
            <Input
              placeholder="VD: Thẻ chính, Ví cá nhân..."
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
          </FormField>

          <Checkbox
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            label={t('paymentAccounts.checkboxDefault')}
          />

          {formError && <p className="text-xs text-red-300">{formError}</p>}
          {formSuccess && <p className="text-xs rogym-sx-b2fbf853">{t('paymentAccounts.submitSuccess')}</p>}

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            className="w-full justify-center mt-1"
          >
            {t('paymentAccounts.buttonSave')}
          </Button>
        </MemberCard>
      </div>
    </MemberPage>
  )
}
