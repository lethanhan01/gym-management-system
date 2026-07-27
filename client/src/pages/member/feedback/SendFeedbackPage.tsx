import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink } from '@/components/ui/Button'
import { CheckCircle2, Users, Wrench, Star } from 'lucide-react'
import { MemberPage, MemberPageHeader } from '@/components/MemberUI'
import { feedbackService } from '@/services/feedback.service'
import { useAuthStore } from '@/stores/authStore'

type FeedbackType = 'staff' | 'equipment' | 'service'
type Severity = 'low' | 'medium' | 'high'

export default function SendFeedbackPage() {
  const { t } = useTranslation('member')
  const user = useAuthStore(state => state.user)

  const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
    { value: 'staff',     label: t('feedback.send.typeLabel.staff'),     icon: <Users size={18} /> },
    { value: 'equipment', label: t('feedback.send.typeLabel.equipment'), icon: <Wrench size={18} /> },
    { value: 'service',   label: t('feedback.send.typeLabel.service'),   icon: <Star size={18} /> },
  ]

  const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
    { value: 'low',    label: t('feedback.send.severityLabel.low') },
    { value: 'medium', label: t('feedback.send.severityLabel.medium') },
    { value: 'high',   label: t('feedback.send.severityLabel.high') },
  ]
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('service')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) { setError(t('feedback.send.errorEmpty')); return }
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
      setError(e?.response?.data?.message || t('feedback.send.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow={t('feedback.send.eyebrow')}
        title={t('feedback.send.title')}
        description={t('feedback.send.description')}
        actions={
          <ButtonLink variant="outline-white" to="/member/feedback">
            {t('feedback.send.backLink')}
          </ButtonLink>
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
            <h2 className="text-xl font-bold text-white">{t('feedback.send.successTitle')}</h2>
            <p className="mt-2 text-sm rogym-sx-d88f932f">
              {t('feedback.send.successDesc')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <ButtonLink
                variant="primary"
                to="/member/feedback"
                className="px-6 py-2.5 text-sm"
              >
                {t('feedback.send.buttonViewMy')}
              </ButtonLink>
              <Button
                variant="outline-white"
                onClick={() => { setSuccess(false); setContent(''); setFeedbackType('service'); setSeverity('medium') }}
                className="px-6 py-2.5 text-sm"
              >
                {t('feedback.send.buttonSendAnother')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="rogym-sx-df69c9fe">
              {/* Type selector */}
              <div className="mb-6">
                <p className="mb-3 text-sm font-semibold text-white">{t('feedback.send.sectionType')}</p>
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
                <p className="mb-3 text-sm font-semibold text-white">{t('feedback.send.sectionSeverity')}</p>
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
                <p className="mb-2 text-sm font-semibold text-white">{t('feedback.send.sectionContent')}</p>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={t('feedback.send.contentPlaceholder')}
                  required
                  className="rogym-input w-full resize-none rogym-sx-75e2c7e4"
                  
                />
              </div>

              {error && (
                <p className="mb-4 text-sm rogym-sx-00644777" >{error}</p>
              )}

              <Button
                variant="primary"
                size="wide"
                type="submit"
                disabled={submitting}
                className="w-full"
              >
                {submitting ? t('feedback.send.buttonSubmitting') : t('feedback.send.buttonSubmit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MemberPage>
  )
}
