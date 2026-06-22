import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, LoaderCircle, CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { STAFF_POSITION_COLOR, USER_STATUS_COLOR, USER_STATUS_LABEL } from '@/lib/owner-constants'
import {
  type StaffPosition,
  staffService,
  type StaffProfile,
  type ListStaffParams,
} from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerPagination,
  OwnerSearchInput,
  OwnerSkeleton,
  OwnerBadge,
  OwnerSelect,
} from '@/components/OwnerUI'

const PAGE_SIZE = 20

export default function UsersPage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const currentUser = useAuthStore((s) => s.user)
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [status, setStatus] = useState('active')
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchStaff = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const params: ListStaffParams = {
          page: pg,
          pageSize: PAGE_SIZE,
          status: status || undefined,
          position: (position as StaffPosition) || undefined,
          search: search || undefined,
        }
        const { data, total: fetchedTotal } = await staffService.list(params)
        setStaffList(data)
        setTotal(fetchedTotal)
      } catch (err) {
        setError(getApiError(err, t('staffManagement.users.loadFailed')))
      } finally {
        setLoading(false)
      }
    },
    [search, position, status]
  )

  useEffect(() => {
    fetchStaff(page)
  }, [fetchStaff, page])

  // Reset page on filter change
  function handleFilterChange(setter: (v: string) => void) {
    return (val: string) => {
      setter(val)
      setPage(1)
    }
  }

  async function handleDelete(staff: StaffProfile) {
    setDeletingId(staff.staffId)
    setDeleteError(null)
    try {
      await staffService.delete(staff.staffId)
      setStaffList((prev) => prev.filter((s) => s.staffId !== staff.staffId))
      setTotal((prev) => prev - 1)
    } catch (err) {
      if (isApiConflict(err)) {
        setDeleteError(t('staffManagement.users.deleteFailed'))
      } else {
        setDeleteError(getApiError(err, t('staffManagement.users.deleteFailed')))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow={t('staffManagement.users.eyebrow')}
        title={t('staffManagement.users.title')}
        description={t('staffManagement.users.totalCount', { total })}
        actions={
          <div className="flex gap-2">
            <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff/schedules">
              <CalendarDays size={16} /> {t('staffManagement.users.scheduleBtn')}
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
              <Plus size={16} /> {t('staffManagement.users.addBtn')}
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <OwnerSearchInput
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder={t('staffManagement.users.searchPlaceholder')}
        />
        <OwnerSelect
          value={position}
          onValueChange={handleFilterChange(setPosition)}
        >
          <option value="">{t('staffManagement.users.positions.all')}</option>
          <option value="staff">{t('staffManagement.users.positions.staff')}</option>
          <option value="trainer">{t('staffManagement.users.positions.trainer')}</option>
          <option value="owner">{t('staffManagement.users.positions.owner')}</option>
        </OwnerSelect>
        <OwnerSelect
          value={status}
          onValueChange={handleFilterChange(setStatus)}
          required
        >
          <option value="">{t('staffManagement.users.statusFilter.all')}</option>
          <option value="active">{tCommon('status.active')}</option>
          <option value="inactive">{tCommon('status.inactive')}</option>
          <option value="working">{tCommon('status.working')}</option>
        </OwnerSelect>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          onClick={() => { setPage(1); fetchStaff(1) }}
        >
          {tCommon('button.search')}
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
          {deleteError}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => fetchStaff(page)} />
      ) : staffList.length === 0 ? (
        <OwnerEmptyState
          title={t('staffManagement.users.notFound')}
          description={t('staffManagement.users.notFoundDesc')}
          action={
            <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
              <Plus size={16} /> {t('staffManagement.users.addBtn')}
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">{t('staffManagement.users.table.code')}</th>
                  <th className="px-5 py-3 font-medium">{t('staffManagement.users.table.name')}</th>
                  <th className="px-5 py-3 font-medium">{t('staffManagement.users.table.email')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('staffManagement.users.table.position')}</th>
                  <th className="px-5 py-3 font-medium">{t('staffManagement.users.table.status')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('staffManagement.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffList.map((staff) => (
                  <tr key={staff.staffId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs rogym-text-dim">
                      {staff.staffCode}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{staff.fullName}</td>
                    <td className="px-5 py-4 rogym-text-secondary">{staff.email}</td>
                    <td className="px-5 py-4 text-right">
                      <OwnerBadge
                        label={staff.position}
                        color={STAFF_POSITION_COLOR[staff.position] ?? '#6b7280'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <OwnerBadge
                        label={USER_STATUS_LABEL[staff.status] ?? staff.status}
                        color={USER_STATUS_COLOR[staff.status] ?? '#6b7280'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/owner/staff/${staff.staffId}`}
                          className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                        >
                          <Edit2 size={14} /> {t('staffManagement.users.detailBtn')}
                        </Link>
                        {staff.status !== 'deleted' && staff.staffId !== currentUser?.staffId && (
                          <button
                            className="rogym-btn rogym-btn--danger rogym-btn--nav"
                            disabled={deletingId === staff.staffId}
                            onClick={() => handleDelete(staff)}
                          >
                            {deletingId === staff.staffId ? (
                              <LoaderCircle size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            {tCommon('button.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <OwnerPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </OwnerPage>
  )
}
