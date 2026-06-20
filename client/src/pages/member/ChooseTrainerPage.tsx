import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { memberService, type TrainerSummary } from '@/services/member.service'
import { MemberPage, MemberPageHeader, MemberSkeleton, MemberEmptyState } from '@/components/MemberUI'

const POSITION_LABEL: Record<string, string> = {
  trainer: 'Huấn luyện viên',
  pt: 'Personal Trainer',
}

export default function ChooseTrainerPage() {
  const navigate = useNavigate()
  const [trainers, setTrainers] = useState<TrainerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    memberService.getAvailableTrainers()
      .then((data) => { setTrainers(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  async function handleConfirm() {
    if (!selected) return
    setSubmitError('')
    setSubmitting(true)
    try {
      await memberService.selfAssignTrainer(Number(selected))
      navigate('/member', { replace: true })
    } catch {
      setSubmitError('Không thể chọn PT này. Vui lòng thử lại.')
      setSubmitting(false)
    }
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Huấn luyện viên"
        title="Chọn huấn luyện viên"
        description="Chọn một PT phụ trách cho gói tập của bạn. Bạn có thể đổi PT bất kỳ lúc nào."
        actions={
          <button
            className="rogym-btn rogym-btn--outline-white flex items-center gap-1.5 text-sm"
            onClick={() => navigate('/member')}
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
        }
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error ? (
        <MemberEmptyState
          title="Không thể tải danh sách"
          description="Đã có lỗi khi tải danh sách huấn luyện viên. Vui lòng thử lại."
        />
      ) : trainers.length === 0 ? (
        <MemberEmptyState
          title="Chưa có huấn luyện viên"
          description="Hệ thống hiện chưa có PT nào. Vui lòng liên hệ quầy lễ tân để được hỗ trợ."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((t) => {
              const initials = t.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
              const isSelected = selected === t.staffId
              return (
                <button
                  key={t.staffId}
                  onClick={() => setSelected(t.staffId)}
                  className={`rogym-card rogym-card--compact p-5 flex flex-col items-center gap-3 text-center cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'ring-2 ring-[var(--rogym-teal)] ring-offset-1 ring-offset-transparent'
                      : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-center rounded-full shrink-0 rogym-sx-20f77b4b">
                    <span className="rogym-sx-2e7dd58d">{initials}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{t.fullName}</h3>
                    <p className="mt-1 text-xs rogym-text-secondary">
                      {POSITION_LABEL[t.position] ?? t.position}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="rogym-tone-badge" data-tone="success">Đã chọn</span>
                  )}
                </button>
              )
            })}
          </div>

          {submitError && (
            <p className="text-sm text-red-400 text-center">{submitError}</p>
          )}

          <div className="flex justify-end pt-2">
            <button
              className="rogym-btn rogym-btn--primary px-8"
              disabled={!selected || submitting}
              onClick={handleConfirm}
            >
              {submitting ? 'Đang xử lý...' : 'Chọn làm PT của tôi'}
            </button>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
