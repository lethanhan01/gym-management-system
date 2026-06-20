import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { rbacService, type Permission } from '@/services/rbac.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSelect,
  OwnerSearchInput,
} from '@/components/OwnerUI'

const RESOURCES = [
  { value: '', label: 'Tất cả' },
  { value: 'user', label: 'Người dùng' },
  { value: 'member', label: 'Hội viên' },
  { value: 'staff', label: 'Nhân viên' },
  { value: 'package', label: 'Gói tập' },
  { value: 'subscription', label: 'Đăng ký' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'room', label: 'Phòng tập' },
  { value: 'equipment', label: 'Thiết bị' },
  { value: 'maintenance', label: 'Bảo trì' },
  { value: 'session', label: 'Buổi tập' },
  { value: 'attendance', label: 'Điểm danh' },
  { value: 'progress', label: 'Tiến độ' },
  { value: 'feedback', label: 'Phản hồi' },
  { value: 'schedule', label: 'Lịch làm việc' },
  { value: 'report', label: 'Báo cáo' },
  { value: 'rbac', label: 'Phân quyền' },
]

const ACTION_LABEL: Record<string, string> = {
  read: 'Xem',
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xóa',
  manage: 'Quản lý',
  view: 'Xem',
  handle: 'Xử lý',
  checkin: 'Check-in',
  report: 'Báo cáo',
  resolve: 'Giải quyết',
}

const ACTION_COLOR: Record<string, string> = {
  read: '#3b82f6',
  create: '#22c55e',
  update: '#f59e0b',
  delete: '#ef4444',
  manage: '#8b5cf6',
  view: '#3b82f6',
  handle: '#f97316',
  checkin: '#06bbfb',
  report: '#ec4899',
  resolve: '#06c384',
}

function getAction(code: string): string {
  const parts = code.split('.')
  return ACTION_LABEL[parts[1]] ?? parts[1] ?? ''
}

function getActionColor(code: string): string {
  const parts = code.split('.')
  return ACTION_COLOR[parts[1]] ?? '#6b7280'
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [resource, setResource] = useState('')

  useEffect(() => {
    setLoading(true)
    rbacService
      .listPermissions({ pageSize: 100, resource: resource || undefined })
      .then(({ data }) => setPermissions(data))
      .catch(() => setError('Không thể tải danh sách quyền.'))
      .finally(() => setLoading(false))
  }, [resource])

  const filtered = permissions.filter(
    (p) =>
      !search ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
    const resource = p.code.split('.')[0]
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {})

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Phân quyền"
        title="Danh mục quyền"
        description={`${permissions.length} quyền trong hệ thống — chỉ đọc`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <OwnerSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo mã, tên, mô tả..."
          className="flex-1 min-w-[200px]"
        />
        <OwnerSelect
          value={resource}
          onValueChange={setResource}
          className="rogym-select min-w-[160px]"
        >
          {RESOURCES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </OwnerSelect>
      </div>

      {loading ? (
        <OwnerSkeleton rows={8} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([res, perms]) => (
            <div key={res}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wider rogym-text-accent">
                  {RESOURCES.find((r) => r.value === res)?.label ?? res}
                </h2>
                <div className="h-px flex-1 border-t border-white/5" />
                <span className="text-xs rogym-text-dim">{perms.length} quyền</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {perms.map((p) => (
                  <div
                    key={p.permissionId}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <code className="text-xs font-mono rogym-text-accent">{p.code}</code>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: `${getActionColor(p.code)}22`,
                          color: getActionColor(p.code),
                          border: `1px solid ${getActionColor(p.code)}44`,
                        }}
                      >
                        {getAction(p.code)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {p.description && (
                      <p className="mt-1 text-xs rogym-text-dim">{p.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <OwnerEmptyState title="Không tìm thấy quyền nào" description="Thử thay đổi bộ lọc." />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-xs rogym-text-dim">
        <Lock size={14} />
        Danh mục quyền chỉ đọc — quyền được quản lý bởi hệ thống. Việc thêm/sửa/xóa quyền cần cập
        nhật database seed và khởi động lại server.
      </div>
    </OwnerPage>
  )
}
