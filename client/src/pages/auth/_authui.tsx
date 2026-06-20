import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Dumbbell, Eye, EyeOff } from 'lucide-react'
import gym from '@/assets/gym-bg-optimized.jpg'

export const G = '#06c384'
export const T = '#42e09e'
export const GD = '#00492f'

/* ── Pill sweep — primary (green) ── */
export function BtnPrimary({
  children,
  type = 'button',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rogym-btn rogym-btn--primary rogym-btn--wide"
    >
      <span className="flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}

/* ── Pill sweep — outline white ── */
export function BtnOutlineWhite({
  children,
  type = 'button',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rogym-btn rogym-btn--outline-white rogym-btn--wide"
    >
      <span className="flex items-center justify-center gap-2">{children}</span>
    </button>
  )
}

/* ── Text link with sliding underline ── */
export function TextLink({
  children,
  onClick,
  to,
}: {
  children: React.ReactNode
  onClick?: () => void
  to?: string
}) {
  if (to) {
    return (
      <Link to={to} className="rogym-auth-text-link rogym-text-link">
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="rogym-auth-text-link rogym-text-link">
      {children}
    </button>
  )
}

/* ── Muted text link ── */
export function MutedLink({
  children,
  onClick,
  to,
}: {
  children: React.ReactNode
  onClick?: () => void
  to?: string
}) {
  if (to) {
    return (
      <Link
        to={to}
        className="rogym-auth-text-link is-muted rogym-text-link rogym-text-link--muted"
      >
        {children}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="rogym-auth-text-link is-muted rogym-text-link rogym-text-link--muted"
    >
      {children}
    </button>
  )
}

/* ── Password toggle field wrapper ── */
export function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  icon?: LucideIcon
}) {
  const [show, setShow] = useState(false)
  return (
    <Field
      label={label}
      type={show ? 'text' : 'password'}
      placeholder={placeholder ?? '••••••••'}
      value={value}
      onChange={onChange}
      icon={Icon}
      right={
        <button type="button" onClick={() => setShow((s) => !s)} className="rogym-sx-4baf3f03">
          {show ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
        </button>
      }
    />
  )
}

/* ── Input field ── */
export function Field({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon: Icon,
  right,
  autoComplete,
  name,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  icon?: LucideIcon
  right?: React.ReactNode
  autoComplete?: string
  name?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="rogym-sx-c72a6bf5">
        {label}
      </label>
      <div className="rogym-auth-field relative">
        {Icon && (
          <div className="rogym-auth-field__icon absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon size={15} strokeWidth={2} />
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          name={name}
          className={`rogym-auth-field__input w-full rounded-xl py-3 text-sm outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.2)] ${
            Icon ? 'has-icon' : ''
          } ${right ? 'has-action' : ''}`}
        />
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
    </div>
  )
}

/* ── Error message ── */
export function ErrorMsg({ message }: { message: string }) {
  return <p className="rogym-sx-d50aacc0">{message}</p>
}

/* ── Divider ── */
export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px rogym-sx-0881c59b" />
      <span className="rogym-sx-7d3000c1">{label}</span>
      <div className="flex-1 h-px rogym-sx-0881c59b" />
    </div>
  )
}

/* ── Full-page auth shell (background + logo + glass card) ── */
export function AuthShell({
  children,
  maxWidth = 400,
  backTo = '/',
  backLabel = 'Trang chủ',
}: {
  children: React.ReactNode
  maxWidth?: number
  backTo?: string
  backLabel?: string
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden rogym-sx-7b5fda64">
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center rogym-sx-27af414f"
        />
        <div className="absolute inset-0 rogym-sx-3e33f998" />
        <div className="absolute inset-0 rogym-sx-7bbccc2e" />
      </div>

      <Link
        to={backTo}
        className="rogym-text-link rogym-text-link--muted absolute top-6 left-6 z-20 rogym-sx-aa61ae66"
      >
        <ArrowLeft size={14} strokeWidth={2} className="rogym-sx-c2bafe49" />
        <span>{backLabel}</span>
      </Link>

      <div
        className={`rogym-auth-shell__content relative z-10 w-full mx-4 ${maxWidth > 400 ? 'is-wide' : ''}`}
      >
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center rogym-sx-1c639e32">
            <Dumbbell size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="rogym-sx-f326e6e8">ROGYM</span>
        </div>

        <div className="rounded-2xl p-8 rogym-sx-a4968112">{children}</div>
      </div>
    </div>
  )
}
