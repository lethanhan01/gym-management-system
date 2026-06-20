import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Phone, Mail, Lock, MapPin } from 'lucide-react'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pass !== confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (pass.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }
    if (!dob) {
      setError('Vui lòng nhập ngày sinh.')
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
        setError('Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.')
      } else if (status === 429) {
        setError('Bạn thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.')
      } else if (!e?.response) {
        setError('Không thể kết nối. Kiểm tra mạng và thử lại.')
      } else {
        setError(e?.response?.data?.message || 'Đăng ký thất bại. Email có thể đã được sử dụng.')
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
            Tạo tài khoản
          </h1>
          <p
            className="rogym-sx-0a664e64"
          >
            Gia nhập cộng đồng RoGym ngay hôm nay
          </p>
        </div>

        <Field
          label="Họ và tên"
          name="name"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          value={name}
          onChange={setName}
          icon={User}
        />
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="ten@email.com"
          value={email}
          onChange={setEmail}
          icon={Mail}
        />
        <Field
          label="Số điện thoại"
          type="tel"
          name="tel"
          autoComplete="tel"
          placeholder="0912 345 678"
          value={phone}
          onChange={setPhone}
          icon={Phone}
        />
        <div className="flex flex-col gap-1.5">
          <label
            className="rogym-sx-c72a6bf5"
          >
            Ngày sinh
          </label>
          <DatePickerInput
            value={dob}
            onChange={setDob}
            aria-label="Ngày sinh"
            placeholder="Ngày sinh"
          />
        </div>
        <Field
          label="Địa chỉ"
          name="street-address"
          autoComplete="street-address"
          placeholder="12 Lê Lợi, Q.1, TP.HCM"
          value={address}
          onChange={setAddress}
          icon={MapPin}
        />
        <PasswordField
          label="Mật khẩu"
          placeholder="Tối thiểu 8 ký tự"
          value={pass}
          onChange={setPass}
          icon={Lock}
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          value={confirm}
          onChange={setConfirm}
          icon={Lock}
        />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={loading}>
          {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </BtnPrimary>

        <p
          className="text-center rogym-sx-ccbcbd08"
          
        >
          Bằng cách đăng ký, bạn đồng ý với <TextLink>Điều khoản dịch vụ</TextLink> và{' '}
          <TextLink>Chính sách bảo mật</TextLink>.
        </p>

        <Divider label="đã có tài khoản?" />

        <BtnOutlineWhite onClick={() => navigate('/login')}>Đăng nhập</BtnOutlineWhite>
      </form>
    </AuthShell>
  )
}
