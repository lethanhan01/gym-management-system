import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Search, TrendingUp, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import { formatDate } from '@/lib/date'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'
import { FilterDropdown } from '@/components/FilterDropdown'

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
    <TrainerPage>
      <TrainerPageHeader
        eyebrow={t('students.list.eyebrow')}
        title={t('students.list.title')}
        description={t('students.list.description', { total })}
      />

      <div className="rogym-card rogym-card--compact flex items-center gap-3 p-4">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder={t('students.list.searchPlaceholder')}
          />
        </div>
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
          title={t('students.list.filterTitle', 'Bộ lọc')}
        >
          <div>
            <p className="rogym-field-label mb-2">{t('students.list.colStatus')}</p>
            <TrainerSelect
              value={draftStatus}
              onValueChange={setDraftStatus}
            >
              <option value="">{t('students.list.allStatuses')}</option>
              <option value="active">{t('students.list.statusActive')}</option>
              <option value="pending_verification">{t('students.list.statusPending')}</option>
              <option value="locked">{t('students.list.statusLocked')}</option>
            </TrainerSelect>
          </div>
        </FilterDropdown>
        <Button variant="primary" onClick={applySearch}>
          {t('students.list.searchButton')}
        </Button>
      </div>

      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState
          title={t('students.list.notFound')}
          description={t('students.list.notFoundDesc')}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="px-5 py-4">{t('students.list.colStudent')}</th>
                  <th className="px-5 py-4">{t('students.list.colPackage')}</th>
                  <th className="px-5 py-4">{t('students.list.colExpiry')}</th>
                  <th className="px-5 py-4">{t('students.list.colStatus')}</th>
                  <th className="px-5 py-4 text-right">{t('students.list.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((student) => (
                  <tr
                    key={student.memberId}
                    className="border-t border-white/5 bg-[var(--rogym-bg-card)]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{student.fullName}</div>
                      <div className="mt-1 text-xs rogym-text-dim">
                        {student.memberCode}
                      </div>
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {student.activeSubscription?.packageName ?? t('students.list.noPackage')}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {formatDate(student.activeSubscription?.endDate)}
                    </td>
                    <td className="px-5 py-4">
                      <TrainerStatusBadge
                        status={student.activeSubscription?.status ?? 'inactive'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <ButtonLink
                          variant="text-accent"
                          to={`/trainer/students/${student.memberId}`}
                        >
                          {t('students.list.actionDetail')}
                        </ButtonLink>
                        <ButtonLink
                          variant="text"
                          to={`/trainer/students/${student.memberId}/progress`}
                        >
                          {t('students.list.actionProgress')}
                        </ButtonLink>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {data.map((student) => (
              <div key={student.memberId} className="rogym-card rogym-card--compact p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                      <UserRound size={19} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{student.fullName}</div>
                      <div className="text-xs rogym-text-dim">
                        {student.memberCode}
                      </div>
                    </div>
                  </div>
                  <TrainerStatusBadge
                    status={student.activeSubscription?.status ?? 'inactive'}
                  />
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
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline-white"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            {t('students.list.prevPage')}
          </Button>
          <span className="text-sm rogym-text-secondary">
            {t('students.list.page', { current: page, total: totalPages })}
          </span>
          <Button
            variant="outline-white"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            {t('students.list.nextPage')}
          </Button>
        </div>
      )}
    </TrainerPage>
  )
}
