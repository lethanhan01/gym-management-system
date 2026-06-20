import { useEffect, useState } from 'react'
import { Trash2, Star, Check, Wallet } from 'lucide-react'
import paymentAccountService, { type PaymentAccount, type CreatePaymentAccountPayload } from '@/services/paymentAccount.service'
import { type PaymentMethod } from '@/services/payment.service'
import { useAuthStore } from '@/stores/authStore'
import { MemberPage, MemberPageHeader, MemberSkeleton } from '@/components/MemberUI'
import {
  getPaymentMethodLabel,
  maskPaymentAccountRef,
  PAYMENT_METHOD_OPTIONS,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'

function InputField({
  label, placeholder, value, onChange,
}: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs rogym-text-dim mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rogym-input w-full"
      />
    </div>
  )
}

export default function PaymentAccountsPage() {
  const { user } = useAuthStore()

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
      setFormError('Có lỗi xảy ra. Vui lòng thử lại.')
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
        eyebrow="Thanh toán"
        title="Tài khoản thanh toán"
        description="Quản lý các phương thức thanh toán đã lưu."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── LEFT: accounts list ── */}
        <div>
          {loading ? (
            <MemberSkeleton rows={3} />
          ) : accounts.length === 0 ? (
            <div className="rogym-card rogym-card--compact flex flex-col items-center justify-center py-14 gap-3">
              <Wallet size={36} className="rogym-text-faint" />
              <p className="text-sm rogym-text-secondary">Chưa có tài khoản nào được lưu</p>
              <p className="text-xs rogym-text-dim text-center max-w-xs">
                Thêm tài khoản để điền nhanh khi thanh toán gói tập
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {accounts.map(acc => (
                <div
                  key={acc.accountId}
                  className={`rogym-payment-account rogym-card rogym-card--compact px-5 py-4 flex items-center gap-4 ${
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
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full rogym-sx-044401f6" >
                          <Star size={9} fill="currentColor" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-xs rogym-text-secondary mt-0.5">
                      {getPaymentMethodLabel(acc.type)}
                      {acc.provider && acc.provider !== acc.label ? ` · ${acc.provider}` : ''}
                      {acc.accountRef ? ` · ${maskPaymentAccountRef(acc.accountRef)}` : ''}
                    </p>
                  </div>

                  {!acc.isDefault && (
                    <button
                      onClick={() => handleSetDefault(acc.accountId)}
                      title="Đặt làm mặc định"
                      className="rogym-account-action is-default-action rogym-btn rogym-btn--icon rogym-btn--elevated rogym-sx-8ae812d4"
                    >
                      <Star size={15} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(acc.accountId)}
                    title="Xoá"
                    className="rogym-account-action is-delete-action rogym-btn rogym-btn--icon rogym-btn--elevated rogym-sx-81543379"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: quick add card ── */}
        <div className="rogym-card rogym-card--compact p-6 flex flex-col gap-4 xl:self-start">
          <h3 className="text-base font-bold text-white">
            Thêm tài khoản mới
          </h3>

          {/* Type selector */}
          <div className="flex gap-2">
            {PAYMENT_METHOD_OPTIONS.map(opt => (
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
              <InputField label="Tên ngân hàng" placeholder="Vietcombank, BIDV, Techcombank..." value={provider} onChange={setProvider} />
              <InputField label="Số tài khoản" placeholder="1234567890" value={accountRef} onChange={setAccountRef} />
            </>
          )}
          {type === 'ewallet' && (
            <>
              <InputField label="Ví điện tử" placeholder="MoMo, ZaloPay, VNPay..." value={provider} onChange={setProvider} />
              <InputField label="Số điện thoại" placeholder="0912 345 678" value={accountRef} onChange={setAccountRef} />
            </>
          )}

          <InputField label="Tên hiển thị (tuỳ chọn)" placeholder="VD: Thẻ chính, Ví cá nhân..." value={label} onChange={setLabel} />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setIsDefault(v => !v)}
              className={`rogym-checkbox flex items-center justify-center rounded transition-all shrink-0 ${
                isDefault ? 'is-checked' : ''
              }`}
            >
              {isDefault && <Check size={11} className="rogym-sx-b2fbf853" />}
            </div>
            <span className="text-sm rogym-text-secondary">Đặt làm tài khoản mặc định</span>
          </label>

          {formError && <p className="text-xs text-red-300">{formError}</p>}
          {formSuccess && <p className="text-xs rogym-sx-b2fbf853" >Tài khoản đã được thêm.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rogym-btn rogym-btn--primary w-full justify-center mt-1"
          >
            {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
          </button>
        </div>
      </div>
    </MemberPage>
  )
}
