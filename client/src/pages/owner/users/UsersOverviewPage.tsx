import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { type StaffPosition, staffService, type StaffProfile } from '@/services/staff.service'
import { STAFF_POSITION_COLOR, USER_STATUS_COLOR } from '@/lib/owner-constants'
import {
  Page,
  PageHeader,
  Card,
  SearchInput,
  Select,
  ResponsiveTable,
  Button,
  ButtonLink,
  Badge,
  StatusBadge,
  type ColumnDef,
} from '@/components/ui'

type Tab = 'members' | 'staff'

export default function UsersOverviewPage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')

  const [searchParams, setSearchParams] = useSearchParams()

  const tab = (searchParams.get('tab') as Tab | null) ?? 'members'
  const page = Number(searchParams.get('page') ?? 1)
  const memberStatus = searchParams.get('status') ?? ''
  const memberSubStatus = searchParams.get('subStatus') ?? ''
  const staffPosition = searchParams.get('position') ?? ''

  const [members, setMembers] = useState<TrainerStudentSummary[]>([])
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberTotalPages, setMemberTotalPages] = useState(1)

  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [staffTotal, setStaffTotal] = useState(0)
  const [staffTotalPages, setStaffTotalPages] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    if (tab === 'members') {
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
        .catch((err) => setError(getApiError(err, tCommon('error.loadFailed'))))
        .finally(() => setLoading(false))
    } else {
      staffService
        .list({
          page,
          pageSize: 15,
          search: searchParams.get('search') ?? undefined,
          position: ['owner', 'staff', 'trainer', 'member'].includes(staffPosition)
            ? (staffPosition as StaffPosition)
            : undefined,
        })
        .then((result) => {
          setStaffList(result.data)
          setStaffTotal(result.total)
          setStaffTotalPages(Math.max(1, Math.ceil(result.total / 15)))
        })
        .catch((err) => setError(getApiError(err, tCommon('error.loadFailed'))))
        .finally(() => setLoading(false))
    }
  }, [tab, page, memberStatus, memberSubStatus, staffPosition, searchParams, tCommon])

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

  function switchTab(tTab: Tab) {
    setSearchParams({ tab: tTab })
  }

  const totalForTab = tab === 'members' ? memberTotal : staffTotal
  const totalPagesForTab = tab === 'members' ? memberTotalPages : staffTotalPages

  const memberColumns: ColumnDef<TrainerStudentSummary>[] = [
    {
      key: 'name',
      header: t('usersOverview.memberTable.name'),
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
      header: t('usersOverview.memberTable.package'),
      render: (member) => (
        <span className="rogym-text-secondary">
          {member.activeSubscription?.packageName ?? t('usersOverview.noPackage')}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: t('usersOverview.memberTable.expiry'),
      render: (member) => (
        <span className="rogym-text-secondary">
          {formatDate(member.activeSubscription?.endDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('usersOverview.memberTable.status'),
      render: (member) => (
        <StatusBadge status={member.activeSubscription?.status ?? member.status} />
      ),
    },
    {
      key: 'actions',
      header: t('usersOverview.memberTable.actions'),
      align: 'right',
      render: (member) => (
        <ButtonLink
          variant="text-accent"
          size="compact"
          to={`/staff/members/${member.memberId}`}
        >
          {tCommon('button.viewDetail')}
        </ButtonLink>
      ),
    },
  ]

  const POSITION_LABEL: Record<string, string> = {
    trainer: t('usersOverview.positions.trainer'),
    pt: t('usersOverview.positions.pt'),
    staff: t('usersOverview.positions.staff'),
    owner: t('usersOverview.positions.owner'),
  }
  const USER_STATUS_LABEL: Record<string, string> = {
    active: t('usersOverview.userStatus.active'),
    pending_verification: t('usersOverview.userStatus.pendingVerification'),
    locked: t('usersOverview.userStatus.locked'),
    deleted: t('usersOverview.userStatus.deleted'),
  }

  const staffColumns: ColumnDef<StaffProfile>[] = [
    {
      key: 'name',
      header: t('usersOverview.staffTable.name'),
      render: (s) => (
        <div>
          <div className="font-semibold text-white">{s.fullName}</div>
          <div className="mt-1 text-xs rogym-text-dim">{s.staffCode}</div>
        </div>
      ),
    },
    {
      key: 'position',
      header: t('usersOverview.staffTable.position'),
      render: (s) => (
        <Badge
          style={{ borderColor: `${STAFF_POSITION_COLOR[s.position] ?? '#6b7280'}40`, color: STAFF_POSITION_COLOR[s.position] ?? '#6b7280' }}
        >
          {POSITION_LABEL[s.position] ?? s.position}
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: t('usersOverview.staffTable.contact'),
      render: (s) => (
        <div className="rogym-text-secondary">
          <div>{s.email}</div>
          {s.phone && <div className="text-xs rogym-text-dim">{s.phone}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('usersOverview.staffTable.status'),
      render: (s) => (
        <Badge
          style={{ borderColor: `${USER_STATUS_COLOR[s.status ?? 'active'] ?? '#6b7280'}40`, color: USER_STATUS_COLOR[s.status ?? 'active'] ?? '#6b7280' }}
        >
          {USER_STATUS_LABEL[s.status ?? 'active'] ?? s.status ?? 'active'}
        </Badge>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('usersOverview.eyebrow')}
        title={t('usersOverview.title')}
        description={t('usersOverview.description', {
          total: totalForTab,
          type: tab === 'members' ? t('usersOverview.tabs.members') : t('usersOverview.tabs.staff'),
        })}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-[var(--rogym-border-teal-dim)] bg-white/[0.025] p-1 w-fit">
        <Button
          variant={tab === 'members' ? 'primary' : 'text-muted'}
          size="compact"
          onClick={() => switchTab('members')}
        >
          {t('usersOverview.tabs.members')}
        </Button>
        <Button
          variant={tab === 'staff' ? 'primary' : 'text-muted'}
          size="compact"
          onClick={() => switchTab('staff')}
        >
          {t('usersOverview.tabs.staff')}
        </Button>
      </div>

      {/* Filters */}
      <Card variant="compact" className="grid gap-3 p-4 md:grid-cols-[1fr_180px_180px]">
        <SearchInput
          value={searchParams.get('search') ?? ''}
          onChange={handleSearchChange}
          placeholder={
            tab === 'members'
              ? t('usersOverview.filter.searchMember')
              : t('usersOverview.filter.searchStaff')
          }
        />
        {tab === 'members' ? (
          <>
            <Select
              value={memberStatus}
              onValueChange={(v) => updateParam('status', v)}
              ariaLabel={t('usersOverview.memberStatus.all')}
            >
              <option value="">{t('usersOverview.memberStatus.all')}</option>
              <option value="active">{t('usersOverview.memberStatus.active')}</option>
              <option value="pending_verification">
                {t('usersOverview.memberStatus.pendingVerification')}
              </option>
              <option value="locked">{t('usersOverview.memberStatus.locked')}</option>
            </Select>
            <Select
              value={memberSubStatus}
              onValueChange={(v) => updateParam('subStatus', v)}
              ariaLabel={t('usersOverview.packageStatus.all')}
            >
              <option value="">{t('usersOverview.packageStatus.all')}</option>
              <option value="active">{t('usersOverview.packageStatus.active')}</option>
              <option value="expired">{t('usersOverview.packageStatus.expired')}</option>
            </Select>
          </>
        ) : (
          <Select
            value={staffPosition}
            onValueChange={(v) => updateParam('position', v)}
            ariaLabel={t('usersOverview.filter.position')}
          >
            <option value="">{t('usersOverview.filter.position')}</option>
            <option value="trainer">{t('usersOverview.positions.trainer')}</option>
            <option value="staff">{t('usersOverview.positions.staff')}</option>
            <option value="owner">{t('usersOverview.positions.owner')}</option>
          </Select>
        )}
      </Card>

      {tab === 'members' ? (
        <ResponsiveTable
          columns={memberColumns}
          data={members}
          keyExtractor={(item) => item.memberId}
          loading={loading}
          error={error}
          emptyTitle={t('usersOverview.notFound')}
          emptyDescription={t('usersOverview.notFoundDesc')}
          renderMobileCard={(member) => (
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
                <StatusBadge status={member.activeSubscription?.status ?? member.status} />
              </div>
              <div className="mt-3 text-sm rogym-text-secondary">
                {member.activeSubscription?.packageName ?? t('usersOverview.noPackage')}
                {member.activeSubscription?.endDate && (
                  <span className="ml-2 text-xs rogym-text-dim">
                    ·{' '}
                    {t('usersOverview.expiresOn', {
                      date: formatDate(member.activeSubscription.endDate),
                    })}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <ButtonLink
                  variant="secondary"
                  mobileFull
                  to={`/staff/members/${member.memberId}`}
                >
                  {tCommon('button.viewDetail')}
                </ButtonLink>
              </div>
            </Card>
          )}
          pagination={
            totalPagesForTab > 1
              ? {
                  page,
                  totalPages: totalPagesForTab,
                  onPageChange: (p) => updateParam('page', String(p)),
                  totalItems: totalForTab,
                  pageSize: 15,
                  showItemCount: true,
                }
              : undefined
          }
        />
      ) : (
        <ResponsiveTable
          columns={staffColumns}
          data={staffList}
          keyExtractor={(item) => item.staffId}
          loading={loading}
          error={error}
          emptyTitle={t('usersOverview.notFound')}
          emptyDescription={t('usersOverview.notFoundDesc')}
          renderMobileCard={(s) => (
            <Card variant="compact">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                    <UserRound size={19} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{s.fullName}</div>
                    <div className="text-xs rogym-text-dim">{s.staffCode}</div>
                  </div>
                </div>
                <Badge
                  style={{ borderColor: `${STAFF_POSITION_COLOR[s.position] ?? '#6b7280'}40`, color: STAFF_POSITION_COLOR[s.position] ?? '#6b7280' }}
                >
                  {POSITION_LABEL[s.position] ?? s.position}
                </Badge>
              </div>
              <div className="mt-3 text-sm rogym-text-secondary">
                {s.email}
                {s.phone && <span className="ml-2 text-xs rogym-text-dim">· {s.phone}</span>}
              </div>
            </Card>
          )}
          pagination={
            totalPagesForTab > 1
              ? {
                  page,
                  totalPages: totalPagesForTab,
                  onPageChange: (p) => updateParam('page', String(p)),
                  totalItems: totalForTab,
                  pageSize: 15,
                  showItemCount: true,
                }
              : undefined
          }
        />
      )}
    </Page>
  )
}
