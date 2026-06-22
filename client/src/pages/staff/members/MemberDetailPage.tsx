import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('staff')
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
      setError(getApiError(err, t('members.detail.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [id, t])

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
        description={`${member.email} · ${member.phone ?? t('members.detail.phoneNotSet')}`}
        actions={
          <Link className="rogym-btn rogym-btn--outline-white" to="/staff/members">
            <ArrowLeft size={16} /> {t('members.detail.backToList')}
          </Link>
        }
      />
      {error && <StaffErrorState message={error} onRetry={load} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">{t('members.detail.personalInfo')}</h2>
          <Info label={t('members.detail.memberCode')} value={member.memberCode} />
          <Info label={t('members.detail.email')} value={member.email} />
          <Info label={t('members.detail.phone')} value={member.phone ?? t('members.detail.phoneNotUpdated')} />
          <Info label={t('members.detail.dateOfBirth')} value={formatDate(member.dateOfBirth)} />
          <Info label={t('members.detail.address')} value={member.address ?? t('members.detail.addressNotUpdated')} />
          <Info
            label={t('members.detail.trainer')}
            value={member.primaryTrainer?.fullName ?? t('members.detail.trainerNotAssigned')}
          />
          <Info label={t('members.detail.joinedAt')} value={formatDate(member.createdAt)} />
        </section>

        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">{t('members.detail.currentPackage')}</h2>
          {activeSubscription ? (
            <>
              <Info label={t('members.detail.package')} value={activeSubscription.packageName} />
              <Info label={t('members.detail.startDate')} value={formatDate(activeSubscription.startDate)} />
              <Info label={t('members.detail.endDate')} value={formatDate(activeSubscription.endDate)} />
              <div className="flex items-start justify-between gap-5 border-b border-white/5 py-3 last:border-0">
                <span className="text-sm rogym-text-dim">{t('members.detail.status')}</span>
                <StaffStatusBadge status={activeSubscription.status} />
              </div>
            </>
          ) : (
            <StaffEmptyState
              title={t('members.detail.noActivePackage')}
              description={t('members.detail.noActivePackageDesc')}
            />
          )}
        </section>
      </div>

      {subscriptionHistory.length > 0 && (
        <section className="rogym-card rogym-card--compact p-6">
          <h2 className="mb-5 text-lg font-bold text-white">{t('members.detail.packageHistory')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="py-3 pr-6">{t('members.detail.colPackage')}</th>
                  <th className="py-3 pr-6">{t('members.detail.colStart')}</th>
                  <th className="py-3 pr-6">{t('members.detail.colEnd')}</th>
                  <th className="py-3 pr-6">{t('members.detail.colStatus')}</th>
                  <th className="py-3">{t('members.detail.colCancelledAt')}</th>
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
