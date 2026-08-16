import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import {
  Page,
  PageHeader,
  Card,
  SearchToolbar,
  Select,
  ResponsiveTable,
  ButtonLink,
  StatusBadge,
  type ColumnDef,
} from '@/components/ui'

export default function MembersPage() {
  const { t } = useTranslation('staff')
  const currentUser = useAuthStore((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Number(searchParams.get('page') ?? 1)
  const memberStatus = searchParams.get('status') ?? ''
  const memberSubStatus = searchParams.get('subStatus') ?? ''

  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberTotalPages, setMemberTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

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

  function handleSearchChange(searchVal: string) {
    const next = new URLSearchParams(searchParams)
    searchVal ? next.set('search', searchVal) : next.delete('search')
    next.set('page', '1')
    setSearchParams(next)
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  const columns: ColumnDef<TrainerStudentSummary>[] = [
    {
      key: 'member',
      header: t('members.list.colMember'),
      render: (member) => (
        <div>
          <div className="font-semibold text-white">{member.fullName}</div>
          <div className="mt-1 text-xs rogym-text-dim">
            {member.memberCode} · {member.email}
          </div>
        </div>
      ),
    },
    {
      key: 'package',
      header: t('members.list.colPackage'),
      render: (member) => (
        <span className="rogym-text-secondary">
          {member.activeSubscription?.packageName ?? t('members.list.noPackage')}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: t('members.list.colExpiry'),
      render: (member) => (
        <span className="rogym-text-secondary">
          {formatDate(member.activeSubscription?.endDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('members.list.colStatus'),
      render: (member) => (
        <StatusBadge status={member.activeSubscription?.status ?? 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: t('members.list.colActions'),
      align: 'right',
      render: (member) => {
        const isSelf = member.userId === currentUser?.userId
        if (isSelf) {
          return <span className="text-xs rogym-text-dim">{t('members.list.you')}</span>
        }
        return (
          <ButtonLink
            variant="text-accent"
            size="compact"
            to={`/staff/members/${member.memberId}`}
          >
            {t('members.list.viewDetail')}
          </ButtonLink>
        )
      },
    },
  ]

  return (
    <Page>
      <StaffHeader total={memberTotal} />

      {/* Filters */}
      <SearchToolbar
        value={searchParams.get('search') ?? ''}
        onChange={handleSearchChange}
        placeholder={t('members.list.searchPlaceholder')}
        filters={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select
              className="w-full sm:w-[180px]"
              value={memberStatus}
              onValueChange={(v) => updateParam('status', v)}
              ariaLabel={t('members.list.filterByStatus')}
            >
              <option value="">{t('members.list.filterByStatus')}</option>
              <option value="active">{t('members.list.statusActive')}</option>
              <option value="pending_verification">{t('members.list.statusPendingVerification')}</option>
              <option value="locked">{t('members.list.statusLocked')}</option>
            </Select>
            <Select
              className="w-full sm:w-[180px]"
              value={memberSubStatus}
              onValueChange={(v) => updateParam('subStatus', v)}
              ariaLabel={t('members.list.filterBySubStatus')}
            >
              <option value="">{t('members.list.filterBySubStatus')}</option>
              <option value="active">{t('members.list.subStatusActive')}</option>
              <option value="expired">{t('members.list.subStatusExpired')}</option>
            </Select>
          </div>
        }
      />

      {/* Data Table */}
      <ResponsiveTable
        columns={columns}
        data={members}
        keyExtractor={(item) => item.memberId}
        loading={loading}
        error={error}
        emptyTitle={t('members.list.noMembers')}
        emptyDescription={t('members.list.noMembersDesc')}
        renderMobileCard={(member) => {
          const isSelf = member.userId === currentUser?.userId
          return (
            <Card variant="compact">
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
                <StatusBadge status={member.activeSubscription?.status ?? 'inactive'} />
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
                  <ButtonLink
                    variant="secondary"
                    mobileFull
                    to={`/staff/members/${member.memberId}`}
                  >
                    {t('members.list.viewDetailFull')}
                  </ButtonLink>
                </div>
              )}
            </Card>
          )
        }}
        pagination={
          memberTotalPages > 1
            ? {
                page,
                totalPages: memberTotalPages,
                onPageChange: (p) => updateParam('page', String(p)),
                totalItems: memberTotal,
                pageSize: 15,
                showItemCount: true,
              }
            : undefined
        }
      />
    </Page>
  )
}

function StaffHeader({ total }: { total: number }) {
  const { t } = useTranslation('staff')
  return (
    <PageHeader
      eyebrow={t('members.list.eyebrow')}
      title={t('members.list.title')}
      description={t('members.list.descriptionWithTotal', { total })}
    />
  )
}
