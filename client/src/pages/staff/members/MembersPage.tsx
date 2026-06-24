import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
} from '@/components/StaffUI'

export default function MembersPage() {
  const { t } = useTranslation('staff')
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') ?? 1)
  const memberStatus = searchParams.get('status') ?? ''
  const memberSubStatus = searchParams.get('subStatus') ?? ''

  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberTotalPages, setMemberTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setSearch(searchParams.get('search') ?? '')

    memberService
      .list({
        page,
        pageSize: 15,
        search: searchParams.get('search') ?? undefined,
        status: memberStatus || undefined,
        subStatus: (memberSubStatus as 'active' | 'expired') || undefined,
      })
      .then((result) => {
        setMembers(result.data)
        setMemberTotal(result.total)
        setMemberTotalPages(Math.max(1, Math.ceil(result.total / 15)))
      })
      .catch((err) => setError(getApiError(err, t('members.list.loadFailed'))))
      .finally(() => setLoading(false))
  }, [page, memberStatus, memberSubStatus, searchParams, t])

  function applySearch() {
    const next = new URLSearchParams(searchParams)
    search ? next.set('search', search) : next.delete('search')
    next.set('page', '1')
    setSearchParams(next)
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('members.list.eyebrow')}
        title={t('members.list.title')}
        description={t('members.list.descriptionWithTotal', { total: memberTotal })}
      />

      {/* Filters */}
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_160px_160px_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder={t('members.list.searchPlaceholder')}
          />
        </div>
        <StaffSelect value={memberStatus} onValueChange={(v) => updateParam('status', v)}>
          <option value="">{t('members.list.filterByStatus')}</option>
          <option value="active">{t('members.list.statusActive')}</option>
          <option value="pending_verification">{t('members.list.statusPendingVerification')}</option>
          <option value="locked">{t('members.list.statusLocked')}</option>
        </StaffSelect>
        <StaffSelect value={memberSubStatus} onValueChange={(v) => updateParam('subStatus', v)}>
          <option value="">{t('members.list.filterBySubStatus')}</option>
          <option value="active">{t('members.list.subStatusActive')}</option>
          <option value="expired">{t('members.list.subStatusExpired')}</option>
        </StaffSelect>
        <button
          type="button"
          className="rogym-btn rogym-btn--icon rogym-btn--elevated"
          onClick={applySearch}
          aria-label={t('members.list.search')}
        >
          <Search size={17} />
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={6} />
      ) : error ? (
        <StaffErrorState message={error} />
      ) : (
        <MembersTab data={members} currentUserId={currentUser?.userId ?? ''} />
      )}

      {memberTotalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
            aria-label={t('members.list.prevPage')}
          >
            <ChevronLeft size={17} />
          </button>
          <span className="text-sm rogym-text-secondary">
            {t('members.list.page', { page, total: memberTotalPages })}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            disabled={page >= memberTotalPages}
            onClick={() => updateParam('page', String(page + 1))}
            aria-label={t('members.list.nextPage')}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </StaffPage>
  )
}

function MembersTab({
  data,
  currentUserId,
}: {
  data: TrainerStudentSummary[]
  currentUserId: string
}) {
  const { t } = useTranslation('staff')

  if (data.length === 0) {
    return (
      <StaffEmptyState
        title={t('members.list.noMembers')}
        description={t('members.list.noMembersDesc')}
      />
    )
  }
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
            <tr>
              <th className="px-5 py-4">{t('members.list.colMember')}</th>
              <th className="px-5 py-4">{t('members.list.colPackage')}</th>
              <th className="px-5 py-4">{t('members.list.colExpiry')}</th>
              <th className="px-5 py-4">{t('members.list.colStatus')}</th>
              <th className="px-5 py-4 text-right">{t('members.list.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => {
              const isSelf = member.userId === currentUserId
              return (
                <tr
                  key={member.memberId}
                  className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{member.fullName}</div>
                    <div className="mt-1 text-xs rogym-text-dim">
                      {member.memberCode} · {member.email}
                    </div>
                  </td>
                  <td className="px-5 py-4 rogym-text-secondary">
                    {member.activeSubscription?.packageName ?? t('members.list.noPackage')}
                  </td>
                  <td className="px-5 py-4 rogym-text-secondary">
                    {formatDate(member.activeSubscription?.endDate)}
                  </td>
                  <td className="px-5 py-4">
                    <StaffStatusBadge
                      status={member.activeSubscription?.status ?? 'inactive'}
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {isSelf ? (
                      <span className="text-xs rogym-text-dim">{t('members.list.you')}</span>
                    ) : (
                      <Link
                        className="rogym-text-link rogym-text-link--accent"
                        to={`/staff/members/${member.memberId}`}
                      >
                        {t('members.list.viewDetail')}
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((member) => {
          const isSelf = member.userId === currentUserId
          return (
            <div key={member.memberId} className="rogym-card rogym-card--compact p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{member.fullName}</div>
                    <div className="text-xs rogym-text-dim">{member.memberCode}</div>
                  </div>
                </div>
                <StaffStatusBadge status={member.activeSubscription?.status ?? 'inactive'} />
              </div>
              <div className="mt-3 text-sm rogym-text-secondary">
                {member.activeSubscription?.packageName ?? t('members.list.noActivePackage')}
                {member.activeSubscription?.endDate && (
                  <span className="ml-2 text-xs rogym-text-dim">
                    · {t('members.list.expiry', { date: formatDate(member.activeSubscription.endDate) })}
                  </span>
                )}
              </div>
              {!isSelf && (
                <div className="mt-4">
                  <Link
                    className="rogym-btn rogym-btn--outline-white w-full"
                    to={`/staff/members/${member.memberId}`}
                  >
                    {t('members.list.viewDetailFull')}
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
