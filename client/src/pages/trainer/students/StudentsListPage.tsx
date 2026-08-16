import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { formatDate } from '@/lib/date'
import type { TrainerStudentSummary } from '@/services/member.service'
import {
  Page,
  PageHeader,
  Card,
  SearchToolbar,
  Select,
  FilterDropdown,
  ResponsiveTable,
  ButtonLink,
  StatusBadge,
  type ColumnDef,
} from '@/components/ui'

export default function StudentsListPage() {
  const { t } = useTranslation('trainer')
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)
  const status = searchParams.get('status') ?? ''
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('')

  const { data, total, totalPages, loading, error, reload } = useTrainerStudents({
    page,
    pageSize: 12,
    search: searchParams.get('search') ?? undefined,
    status: status || undefined,
  })

  function handleSearchChange(searchVal: string) {
    setSearch(searchVal)
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
      key: 'student',
      header: t('students.list.colStudent'),
      render: (student) => (
        <div>
          <div className="font-semibold text-white">{student.fullName}</div>
          <div className="mt-1 text-xs rogym-text-dim">{student.memberCode}</div>
        </div>
      ),
    },
    {
      key: 'package',
      header: t('students.list.colPackage'),
      render: (student) => (
        <span className="rogym-text-secondary">
          {student.activeSubscription?.packageName ?? t('students.list.noPackage')}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: t('students.list.colExpiry'),
      render: (student) => (
        <span className="rogym-text-secondary">
          {formatDate(student.activeSubscription?.endDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('students.list.colStatus'),
      render: (student) => (
        <StatusBadge status={student.activeSubscription?.status ?? 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: t('students.list.colAction'),
      align: 'right',
      render: (student) => (
        <div className="flex justify-end gap-3">
          <ButtonLink
            variant="text-accent"
            size="compact"
            to={`/trainer/students/${student.memberId}`}
          >
            {t('students.list.actionDetail')}
          </ButtonLink>
          <ButtonLink
            variant="text"
            size="compact"
            to={`/trainer/students/${student.memberId}/progress`}
          >
            {t('students.list.actionProgress')}
          </ButtonLink>
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('students.list.eyebrow')}
        title={t('students.list.title')}
        description={t('students.list.description', { total })}
      />

      <SearchToolbar
        value={search}
        onChange={handleSearchChange}
        placeholder={t('students.list.searchPlaceholder')}
        layout="row"
        filters={
          <FilterDropdown
            open={filterOpen}
            onOpenChange={(open) => {
              if (open) {
                setDraftStatus(status)
                setFilterOpen(true)
              } else {
                setFilterOpen(false)
              }
            }}
            activeCount={status ? 1 : 0}
            onApply={() => {
              updateParam('status', draftStatus)
              setFilterOpen(false)
            }}
            onClear={() => {
              setDraftStatus('')
              updateParam('status', '')
              setFilterOpen(false)
            }}
            title={t('students.list.filterTitle', 'Bộ lọc')}
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                {t('students.list.colStatus')}
              </p>
              <Select
                value={draftStatus}
                onValueChange={setDraftStatus}
              >
                <option value="">{t('students.list.allStatuses')}</option>
                <option value="active">{t('students.list.statusActive')}</option>
                <option value="pending_verification">{t('students.list.statusPending')}</option>
                <option value="locked">{t('students.list.statusLocked')}</option>
              </Select>
            </div>
          </FilterDropdown>
        }
      />

      <ResponsiveTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.memberId}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={t('students.list.notFound')}
        emptyDescription={t('students.list.notFoundDesc')}
        renderMobileCard={(student) => (
          <Card variant="compact">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                  <UserRound size={19} />
                </div>
                <div>
                  <div className="font-semibold text-white">{student.fullName}</div>
                  <div className="text-xs rogym-text-dim">{student.memberCode}</div>
                </div>
              </div>
              <StatusBadge status={student.activeSubscription?.status ?? 'inactive'} />
            </div>
            <div className="mt-4 text-sm rogym-text-secondary">
              {student.activeSubscription?.packageName ?? t('students.list.noPackageActive')}
            </div>
            <div className="mt-4 flex gap-3">
              <ButtonLink
                variant="outline-white"
                className="flex-1"
                to={`/trainer/students/${student.memberId}`}
              >
                {t('students.list.actionDetail')}
              </ButtonLink>
              <ButtonLink
                variant="primary"
                className="flex-1"
                to={`/trainer/students/${student.memberId}/progress`}
              >
                <TrendingUp size={15} /> {t('students.list.progressLink')}
              </ButtonLink>
            </div>
          </Card>
        )}
        pagination={
          totalPages > 1
            ? {
                page,
                totalPages,
                onPageChange: (p) => updateParam('page', String(p)),
                totalItems: total,
                pageSize: 12,
                showItemCount: true,
              }
            : undefined
        }
      />
    </Page>
  )
}
