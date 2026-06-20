import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentDetail } from '@/services/member.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  StaffStatusBadge,
} from '@/components/StaffUI'

export default function MemberDetailPage() {
  const { id = '' } = useParams()
  const [member, setMember] = useState<TrainerStudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await memberService.getById(id)
      setMember(data)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải thông tin hội viên.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading)
    return (
      <StaffPage>
        <StaffSkeleton rows={6} />
      </StaffPage>
    )

  if (error && !member)
    return (
      <StaffPage>
        <StaffErrorState message={error} onRetry={load} />
      </StaffPage>
    )

  if (!member) return null

  const activeSubscription = member.subscriptions.find((s) => s.status === 'active') ?? null
  const subscriptionHistory = member.subscriptions.filter((s) => s.status !== 'active')

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={member.memberCode}
        title={member.fullName}
        description={`${member.email} · ${member.phone ?? 'Chưa có số điện thoại'}`}
        actions={
          <Link className="rogym-btn rogym-btn--outline-white" to="/staff/members">
            <ArrowLeft size={16} /> Danh sách
          </Link>
        }
      />
      {error && <StaffErrorState message={error} onRetry={load} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">Hồ sơ cá nhân</h2>
          <Info label="Mã hội viên" value={member.memberCode} />
          <Info label="Email" value={member.email} />
          <Info label="Điện thoại" value={member.phone ?? 'Chưa cập nhật'} />
          <Info label="Ngày sinh" value={formatDate(member.dateOfBirth)} />
          <Info label="Địa chỉ" value={member.address ?? 'Chưa cập nhật'} />
          <Info
            label="Trainer phụ trách"
            value={member.primaryTrainer?.fullName ?? 'Chưa phân công'}
          />
          <Info label="Ngày tham gia" value={formatDate(member.createdAt)} />
        </section>

        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">Gói tập hiện tại</h2>
          {activeSubscription ? (
            <>
              <Info label="Gói" value={activeSubscription.packageName} />
              <Info label="Bắt đầu" value={formatDate(activeSubscription.startDate)} />
              <Info label="Hết hạn" value={formatDate(activeSubscription.endDate)} />
              <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
                <span className="text-sm rogym-text-dim">Trạng thái</span>
                <StaffStatusBadge status={activeSubscription.status} />
              </div>
            </>
          ) : (
            <StaffEmptyState title="Chưa có gói tập active" description="Hội viên chưa đăng ký gói hoặc gói đã hết hạn." />
          )}
        </section>
      </div>

      {subscriptionHistory.length > 0 && (
        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">Lịch sử gói tập</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="py-3 pr-6">Gói tập</th>
                  <th className="py-3 pr-6">Bắt đầu</th>
                  <th className="py-3 pr-6">Hết hạn</th>
                  <th className="py-3 pr-6">Trạng thái</th>
                  <th className="py-3">Ngày hủy</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionHistory.map((sub) => (
                  <tr key={sub.subscriptionId} className="border-t border-white/5">
                    <td className="py-3 pr-6 font-medium text-white">{sub.packageName}</td>
                    <td className="py-3 pr-6 rogym-text-secondary">
                      {formatDate(sub.startDate)}
                    </td>
                    <td className="py-3 pr-6 rogym-text-secondary">
                      {formatDate(sub.endDate)}
                    </td>
                    <td className="py-3 pr-6">
                      <StaffStatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 rogym-text-secondary text-sm">
                      {sub.cancelledAt ? formatDate(sub.cancelledAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </StaffPage>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm rogym-text-dim">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  )
}
