import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, Lock, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DatePickerInput } from '@/components/DatePickerInput'
import { authService } from '@/services/auth.service'
import {
  AuthShell,
  BtnPrimary,
  BtnOutlineWhite,
  TextLink,
  Field,
  PasswordField,
  ErrorMsg,
  Divider,
} from '@/pages/auth/_authui'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [address, setAddress] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const { t: tVal } = useTranslation('validation')
  const { t: tCommon } = useTranslation('common')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pass !== confirm) {
      setError(tVal('password.mismatch'))
      return
    }
    if (pass.length < 8) {
      setError(tVal('password.minLength'))
      return
    }
    if (!dob) {
      setError(tVal('dob.required'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await authService.register(name, phone, email, pass, dob, address || undefined)
      navigate('/member/verify-email', { state: { email, password: pass, devOtp: result.devOtp } })
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 409) {
        setError(tVal('email.alreadyRegistered'))
      } else if (status === 429) {
        setError(tVal('email.rateLimit'))
      } else if (!e?.response) {
        setError(tCommon('error.network'))
      } else {
        setError(e?.response?.data?.message || tVal('registration.failed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell maxWidth={480}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="text-center mb-1">
          <h1
            className="rogym-sx-4d6285f7"
          >
            {t('register.title')}
          </h1>
          <p
            className="rogym-sx-0a664e64"
          >
            {t('register.subtitle')}
          </p>
        </div>

        <Field
          label={t('register.fullName')}
          name="name"
          autoComplete="name"
          placeholder={t('register.fullNamePlaceholder')}
          value={name}
          onChange={setName}
          icon={User}
        />
        <Field
          label={t('register.email')}
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t('register.emailPlaceholder')}
          value={email}
          onChange={setEmail}
          icon={Mail}
        />
        <Field
          label={t('register.phone')}
          type="tel"
          name="tel"
          autoComplete="tel"
          placeholder={t('register.phonePlaceholder')}
          value={phone}
          onChange={setPhone}
          icon={Phone}
        />
        <div className="flex flex-col gap-1.5">
          <label
            className="rogym-sx-c72a6bf5"
          >
            {t('register.dob')}
          </label>
          <DatePickerInput
            value={dob}
            onChange={setDob}
            aria-label={t('register.dob')}
            placeholder={t('register.dob')}
            className="rogym-auth-date-field"
          />
        </div>
        <Field
          label={t('register.address')}
          name="street-address"
          autoComplete="street-address"
          placeholder={t('register.addressPlaceholder')}
          value={address}
          onChange={setAddress}
          icon={MapPin}
        />
        <PasswordField
          label={t('register.password')}
          placeholder={t('register.passwordHint')}
          value={pass}
          onChange={setPass}
          icon={Lock}
          name="new-password"
          autoComplete="new-password"
        />
        <PasswordField
          label={t('register.confirmPassword')}
          value={confirm}
          onChange={setConfirm}
          icon={Lock}
          name="confirm-password"
          autoComplete="new-password"
        />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={loading}>
          {loading ? t('register.submitting') : t('register.submit')}
        </BtnPrimary>

        <p
          className="text-center rogym-sx-ccbcbd08"
        >
          {t('register.terms')} <TextLink>{t('register.termsLink')}</TextLink> {t('register.and')}{' '}
          <TextLink>{t('register.privacyLink')}</TextLink>.
        </p>

        <Divider label={t('register.hasAccount')} />

        <BtnOutlineWhite onClick={() => navigate('/login')}>{t('register.loginBtn')}</BtnOutlineWhite>
      </form>
    </AuthShell>
  )
}
