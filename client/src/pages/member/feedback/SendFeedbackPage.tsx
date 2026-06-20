import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Users, Wrench, Star } from 'lucide-react'
import { MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { feedbackService } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

type FeedbackType = 'staff' | 'equipment' | 'service'
type Severity = 'low' | 'medium' | 'high'

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: 'staff',     label: 'Nhân viên', icon: <Users size={18} /> },
  { value: 'equipment', label: 'Thiết bị',  icon: <Wrench size={18} /> },
  { value: 'service',   label: 'Dịch vụ',   icon: <Star size={18} /> },
]

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'low',    label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high',   label: 'Cao' },
]

export default function SendFeedbackPage() {
  const { user } = useAuthStore()
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('service')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError('Vui lòng nhập nội dung phản hồi.'); return }
    if (!user?.memberId) return
    setSubmitting(true)
    setError(null)
    try {
      await feedbackService.create({
        memberId: String(user.memberId),
        feedbackType,
        content: content.trim(),
        severity,
      })
      setSuccess(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Phản hồi"
        title="Gửi phản hồi"
        description="Chia sẻ trải nghiệm của bạn về dịch vụ, nhân viên hoặc thiết bị"
        actions={
          <Link to="/member/feedback" className="rogym-btn rogym-btn--outline-white">
            Phản hồi của tôi
          </Link>
        }
      />

      <div className="rogym-sx-28f2f99c">
        {success ? (
          <div
            
            className="flex flex-col items-center text-center rogym-sx-dbb7df51"
          >
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-full rogym-sx-430b5d04"
              
            >
              <CheckCircle2 size={32} className="rogym-sx-b2fbf853" />
            </div>
            <h2 className="text-xl font-bold text-white">Phản hồi đã được gửi thành công</h2>
            <p className="mt-2 text-sm rogym-sx-d88f932f" >
              Chúng tôi sẽ xem xét và phản hồi bạn sớm nhất có thể.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                to="/member/feedback"
                className="rogym-btn rogym-btn--primary px-6 py-2.5 text-sm"
              >
                Xem phản hồi của tôi
              </Link>
              <button
                onClick={() => { setSuccess(false); setContent(''); setFeedbackType('service'); setSeverity('medium') }}
                className="rogym-btn rogym-btn--outline-white px-6 py-2.5 text-sm"
              >
                Gửi phản hồi khác
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="rogym-sx-df69c9fe">
              {/* Type selector */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">Loại phản hồi</p>
                <div className="grid grid-cols-3 gap-3">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFeedbackType(opt.value)}
                      className={`rogym-selectable-card flex flex-col items-center gap-2 rounded-xl py-4 text-xs font-medium transition-colors ${
                        feedbackType === opt.value ? 'is-active' : ''
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">Mức độ nghiêm trọng</p>
                <div className="flex gap-3">
                  {SEVERITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className={`rogym-severity-option flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                        severity === opt.value ? 'is-active' : ''
                      }`}
                      data-tone={opt.value}
                    >
                      <span
                        className="rogym-severity-option__dot h-2 w-2 rounded-full"
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold text-white">Nội dung phản hồi</p>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  required
                  className="rogym-input w-full resize-none rogym-sx-75e2c7e4"
                  
                />
              </div>

              {error && (
                <p className="mb-4 text-sm rogym-sx-00644777" >{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rogym-btn rogym-btn--primary rogym-btn--wide w-full"
              >
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MemberPage>
  )
}
