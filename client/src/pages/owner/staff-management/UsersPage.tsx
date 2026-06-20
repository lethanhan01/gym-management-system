import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, LoaderCircle, CalendarDays } from 'lucide-react'
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
        const { data, total: t } = await staffService.list(params)
        setStaffList(data)
        setTotal(t)
      } catch (err) {
        setError(getApiError(err, 'Không thể tải danh sách nhân sự.'))
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
        setDeleteError('Không thể xóa nhân viên này.')
      } else {
        setDeleteError(getApiError(err, 'Xóa thất bại.'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Nhân sự"
        title="Quản lý nhân sự"
        description={`${total} nhân viên trong hệ thống`}
        actions={
          <div className="flex gap-2">
            <Link className="rogym-btn rogym-btn--outline-white" to="/owner/staff/schedules">
              <CalendarDays size={16} /> Lịch phân công
            </Link>
            <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
              <Plus size={16} /> Thêm nhân viên
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <OwnerSearchInput
          value={search}
          onChange={handleFilterChange(setSearch)}
          placeholder="Tìm theo tên, email, mã nhân viên..."
        />
        <OwnerSelect
          value={position}
          onValueChange={handleFilterChange(setPosition)}
        >
          <option value="">Tất cả vị trí</option>
          <option value="staff">Nhân viên</option>
          <option value="trainer">Huấn luyện viên</option>
          <option value="owner">Quản lý</option>
        </OwnerSelect>
        <OwnerSelect
          value={status}
          onValueChange={handleFilterChange(setStatus)}
          required
        >
          <option value="active">Hoạt động</option>
          <option value="pending_verification">Chờ xác thực</option>
          <option value="locked">Bị khóa</option>
          <option value="deleted">Đã xóa</option>
        </OwnerSelect>
        <button
          type="button"
          className="rogym-btn rogym-btn--primary"
          onClick={() => { setPage(1); fetchStaff(1) }}
        >
          Tìm
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
          title="Không có nhân viên nào"
          description="Thử thay đổi bộ lọc hoặc thêm nhân viên mới."
          action={
            <Link className="rogym-btn rogym-btn--primary" to="/owner/staff/new">
              <Plus size={16} /> Thêm nhân viên
            </Link>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">Mã NV</th>
                  <th className="px-5 py-3 font-medium">Họ tên</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium text-right">Vị trí</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-right">Hành động</th>
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
                          <Edit2 size={14} /> Chi tiết
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
                            Xóa
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
