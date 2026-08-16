import { useEffect, useState, useCallback } from 'react'
import { CalendarDays, Eye, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { STAFF_POSITION_COLOR, USER_STATUS_COLOR } from '@/lib/owner-constants'
import {
  type StaffPosition,
  staffService,
  type StaffProfile,
  type ListStaffParams,
} from '@/services/staff.service'
import { useAuthStore } from '@/stores/authStore'
import {
  Page,
  PageHeader,
  SearchToolbar,
  Select,
  ResponsiveTable,
  Button,
  ButtonLink,
  Badge,
  ConfirmDialog,
  type ColumnDef,
} from '@/components/ui'
import { toast } from '@/lib/toast'

const PAGE_SIZE = 20

export default function UsersPage() {
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')
  const positionLabel: Record<string, string> = {
    staff: t('staffManagement.users.positions.staff'),
    trainer: t('staffManagement.users.positions.trainer'),
    pt: t('staffManagement.users.positions.pt'),
    owner: t('staffManagement.users.positions.owner'),
  }
  const userStatusLabel: Record<string, string> = {
    active: t('usersOverview.userStatus.active'),
    pending_verification: t('usersOverview.userStatus.pendingVerification'),
    locked: t('usersOverview.userStatus.locked'),
    deleted: t('usersOverview.userStatus.deleted'),
  }
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
  const [deleteTarget, setDeleteTarget] = useState<StaffProfile | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    [search, position, status, t]
  )

  useEffect(() => {
    fetchStaff(page)
  }, [fetchStaff, page])

  function handleFilterChange(setter: (v: string) => void) {
    return (val: string) => {
      setter(val)
      setPage(1)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await staffService.delete(deleteTarget.staffId)
      setStaffList((prev) => prev.filter((s) => s.staffId !== deleteTarget.staffId))
      setTotal((prev) => prev - 1)
      toast.success(t('staffManagement.users.deleteSuccess', { defaultValue: 'Đã xóa nhân viên thành công' }))
      setDeleteTarget(null)
    } catch (err) {
      const message = isApiConflict(err)
        ? t('staffManagement.users.deleteFailed')
        : getApiError(err, t('staffManagement.users.deleteFailed'))
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: ColumnDef<StaffProfile>[] = [
    {
      key: 'code',
      header: t('staffManagement.users.table.code'),
      render: (staff) => (
        <span className="font-mono text-xs rogym-text-dim">{staff.staffCode}</span>
      ),
    },
    {
      key: 'name',
      header: t('staffManagement.users.table.name'),
      render: (staff) => (
        <span className="font-semibold text-white">{staff.fullName}</span>
      ),
    },
    {
      key: 'email',
      header: t('staffManagement.users.table.email'),
      render: (staff) => (
        <span className="rogym-text-secondary">{staff.email}</span>
      ),
    },
    {
      key: 'position',
      header: t('staffManagement.users.table.position'),
      align: 'right',
      render: (staff) => (
        <Badge
          style={{
            borderColor: `${STAFF_POSITION_COLOR[staff.position] ?? '#6b7280'}40`,
            color: STAFF_POSITION_COLOR[staff.position] ?? '#6b7280',
          }}
        >
          {positionLabel[staff.position] ?? staff.position}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('staffManagement.users.table.status'),
      render: (staff) => (
        <Badge
          style={{
            borderColor: `${USER_STATUS_COLOR[staff.status] ?? '#6b7280'}40`,
            color: USER_STATUS_COLOR[staff.status] ?? '#6b7280',
          }}
        >
          {userStatusLabel[staff.status] ?? staff.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('staffManagement.users.table.actions'),
      align: 'right',
      render: (staff) => (
        <div className="flex items-center justify-end gap-2">
          <ButtonLink
            to={`/owner/staff/${staff.staffId}`}
            variant="icon"
            size="compact"
            aria-label={tCommon('button.viewDetail')}
          >
            <Eye size={15} />
          </ButtonLink>
          {staff.status !== 'deleted' && staff.staffId !== currentUser?.staffId && (
            <Button
              variant="danger"
              size="compact"
              onClick={() => setDeleteTarget(staff)}
              aria-label={tCommon('button.delete')}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('staffManagement.users.eyebrow')}
        title={t('staffManagement.users.title')}
        description={t('staffManagement.users.totalCount', { total })}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink
              variant="outline-white"
              to="/owner/staff/schedules"
            >
              <CalendarDays size={16} /> {t('staffManagement.users.scheduleBtn')}
            </ButtonLink>
            <ButtonLink
              variant="primary"
              to="/owner/staff/new"
            >
              <Plus size={16} /> {t('staffManagement.users.addBtn')}
            </ButtonLink>
          </div>
        }
      />

      {/* Filters */}
      <SearchToolbar
        value={search}
        onChange={handleFilterChange(setSearch)}
        placeholder={t('staffManagement.users.searchPlaceholder')}
        filters={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select
              className="w-full sm:w-[180px]"
              value={position}
              onValueChange={handleFilterChange(setPosition)}
            >
              <option value="">{t('staffManagement.users.positions.all')}</option>
              <option value="staff">{t('staffManagement.users.positions.staff')}</option>
              <option value="trainer">{t('staffManagement.users.positions.trainer')}</option>
              <option value="owner">{t('staffManagement.users.positions.owner')}</option>
            </Select>
            <Select
              className="w-full sm:w-[180px]"
              value={status}
              onValueChange={handleFilterChange(setStatus)}
              required
            >
              <option value="">{t('staffManagement.users.statusFilter.all')}</option>
              <option value="active">{t('usersOverview.userStatus.active')}</option>
              <option value="pending_verification">
                {t('usersOverview.userStatus.pendingVerification')}
              </option>
              <option value="locked">{t('usersOverview.userStatus.locked')}</option>
              <option value="deleted">{t('usersOverview.userStatus.deleted')}</option>
            </Select>
          </div>
        }
      />

      {/* Table */}
      <ResponsiveTable
        columns={columns}
        data={staffList}
        keyExtractor={(item) => item.staffId}
        loading={loading}
        error={error}
        onRetry={() => fetchStaff(page)}
        emptyTitle={t('staffManagement.users.notFound')}
        emptyDescription={t('staffManagement.users.notFoundDesc')}
        emptyAction={
          <ButtonLink variant="primary" to="/owner/staff/new">
            <Plus size={16} /> {t('staffManagement.users.addBtn')}
          </ButtonLink>
        }
        pagination={
          totalPages > 1
            ? {
                page,
                totalPages,
                onPageChange: setPage,
                totalItems: total,
                pageSize: PAGE_SIZE,
                showItemCount: true,
              }
            : undefined
        }
      />

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title={tCommon('button.delete')}
          variant="danger"
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          description={t('staffManagement.users.deleteConfirm', {
            name: deleteTarget.fullName,
            defaultValue: `Bạn có chắc muốn xóa nhân viên ${deleteTarget.fullName}?`,
          })}
          confirmLabel={tCommon('button.delete')}
        />
      )}
    </Page>
  )
}
