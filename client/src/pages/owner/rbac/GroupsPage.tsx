import { useEffect, useState, useCallback } from 'react'
import { Users, LoaderCircle, X, Check } from 'lucide-react'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { rbacService, type Group, type GroupDetail, type Permission } from '@/services/rbac.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerPagination,
  OwnerSearchInput,
  OwnerSkeleton,
} from '@/components/OwnerUI'

const PAGE_SIZE = 20

const SYSTEM_GROUPS = new Set(['owner', 'staff', 'trainer', 'member'])

function EditGroupModal({
  group,
  onClose,
  onUpdated,
}: {
  group: Group
  onClose: () => void
  onUpdated: (g: Group) => void
}) {
  const [description, setDescription] = useState(group.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description) {
      setError('Vui lòng điền đầy đủ.')
      return
    }
    if (description.length < 10) {
      setError('Mô tả phải ít nhất 10 ký tự.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await rbacService.updateGroup(group.groupId, { description })
      onUpdated(saved as unknown as Group)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Lưu thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-bold text-white">Sửa nhóm quyền</h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="rogym-field-label mb-1.5 block">Tên nhóm *</label>
            <input type="text" value={group.name} className="rogym-input" disabled />
          </div>
          <div>
            <label className="rogym-field-label mb-1.5 block">Mô tả *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rogym-input min-h-[80px] resize-none"
              placeholder="Mô tả chức năng nhóm..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="rogym-btn rogym-btn--primary" disabled={saving}>
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PermissionsModal({
  group,
  allPermissions,
  onClose,
  onSaved,
}: {
  group: GroupDetail
  allPermissions: Permission[]
  onClose: () => void
  onSaved?: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(group.permissions.map((p) => p.permissionId))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group by resource
  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const resource = p.code.split('.')[0]
    if (!acc[resource]) acc[resource] = []
    acc[resource].push(p)
    return acc
  }, {})

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const toAdd = [...selected].filter(
        (id) => !group.permissions.some((p) => p.permissionId === id)
      )
      const toRemove = group.permissions
        .filter((p) => !selected.has(p.permissionId))
        .map((p) => p.permissionId)
      if (toAdd.length) await rbacService.assignPermissions(group.groupId, toAdd)
      for (const pid of toRemove) await rbacService.revokePermission(group.groupId, pid)
      onSaved?.()
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Lưu quyền thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-bold text-white">Phân quyền: {group.name}</h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6 p-6">
          {Object.entries(grouped).map(([resource, perms]) => (
            <div key={resource}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest rogym-text-accent">
                {resource}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {perms.map((p) => {
                  const isOn = selected.has(p.permissionId)
                  return (
                    <button
                      key={p.permissionId}
                      onClick={() => toggle(p.permissionId)}
                      className={`rogym-choice-chip flex items-center gap-2 px-3 py-2.5 text-left text-sm${isOn ? ' is-active' : ''}`}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: isOn ? 'var(--rogym-green)' : 'rgba(255,255,255,0.08)',
                        }}
                      >
                        {isOn && <Check size={12} color="#080e0b" />}
                      </span>
                      <div>
                        <div className="font-medium">{p.code}</div>
                        <div className="text-xs opacity-70">{p.name}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">
          <button className="rogym-btn rogym-btn--outline-white" onClick={onClose}>
            Hủy
          </button>
          <button className="rogym-btn rogym-btn--primary" disabled={saving} onClick={handleSave}>
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            Lưu phân quyền
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [editingGroup, setEditingGroup] = useState<Group | undefined>()
  const [permissionsGroup, setPermissionsGroup] = useState<GroupDetail | undefined>()
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchGroups = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const params = { page: pg, pageSize: PAGE_SIZE, search: search || undefined }
        const { data, total: t } = await rbacService.listGroups(params)
        setGroups(data)
        setTotal(t)
      } catch (err) {
        setError(getApiError(err, 'Không thể tải danh sách nhóm quyền.'))
      } finally {
        setLoading(false)
      }
    },
    [search]
  )

  useEffect(() => {
    fetchGroups(page)
    rbacService
      .listPermissions({ pageSize: 100 })
      .then((r) => setAllPermissions(r.data))
      .catch(() => {})
  }, [fetchGroups, page])

  async function handleDelete(group: Group) {
    if (SYSTEM_GROUPS.has(group.name)) return
    setDeleteError(null)
    try {
      await rbacService.deleteGroup(group.groupId)
      setGroups((prev) => prev.filter((g) => g.groupId !== group.groupId))
      setTotal((t) => t - 1)
    } catch (err) {
      if (isApiConflict(err)) {
        setDeleteError('Nhóm đang có thành viên, không thể xóa.')
      } else {
        setDeleteError(getApiError(err, 'Xóa thất bại.'))
      }
    }
  }

  async function openPermissions(group: Group) {
    if (group.name === 'owner') return
    setPermissionsError(null)
    try {
      const detail = await rbacService.getGroup(group.groupId)
      setPermissionsGroup(detail)
    } catch (err) {
      setPermissionsError(getApiError(err, 'Không thể tải quyền của nhóm.'))
    }
  }

  function handleGroupUpdated(group: Group) {
    setGroups((prev) =>
      prev.some((g) => g.groupId === group.groupId)
        ? prev.map((g) => (g.groupId === group.groupId ? group : g))
        : [group, ...prev]
    )
    setEditingGroup(undefined)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Phân quyền"
        title="Nhóm quyền"
        description={`${total} nhóm quyền trong hệ thống`}
      />

      <div className="flex flex-wrap gap-3">
        <OwnerSearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Tìm nhóm..."
          className="flex-1 min-w-[200px]"
        />
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {deleteError}
        </div>
      )}

      {permissionsError && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {permissionsError}
        </div>
      )}

      {loading ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => fetchGroups(page)} />
      ) : groups.length === 0 ? (
        <OwnerEmptyState
          title="Không có nhóm quyền nào"
          description="Chưa có nhóm quyền nào trong hệ thống."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.groupId}
                className="rogym-card rogym-card--compact p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{group.name}</h3>
                        {SYSTEM_GROUPS.has(group.name) && (
                          <span className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase tracking-wider rogym-text-dim">
                            hệ thống
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs rogym-text-dim line-clamp-1">
                        {group.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-sm rogym-text-secondary">
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {group.memberCount} thành viên
                  </span>
                  <span>{group.permissionCount} quyền</span>
                </div>
                <div className="mb-1 min-h-[88px] rounded-xl border border-white/5 bg-white/[0.025] p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider rogym-text-dim">
                    Quyền được gán
                  </div>
                  {group.permissions && group.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions.slice(0, 6).map((permission) => (
                        <span
                          key={permission.permissionId}
                          className="max-w-full truncate rounded-lg border border-[rgba(6,195,132,0.22)] bg-[rgba(6,195,132,0.08)] px-2 py-1 text-[11px] font-medium rogym-text-accent"
                          title={`${permission.code} - ${permission.name}`}
                        >
                          {permission.code}
                        </span>
                      ))}
                      {group.permissions.length > 6 && (
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium rogym-text-secondary">
                          +{group.permissions.length - 6} khác
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs rogym-text-dim">Chưa có quyền nào.</p>
                  )}
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  {group.name === 'owner' ? (
                    <div className="flex-1 rounded-xl border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] px-3 py-2 text-xs font-medium text-amber-200">
                      Quyền cao nhất trong hệ thống, không cần phân quyền.
                    </div>
                  ) : (
                    <button
                      className="rogym-btn rogym-btn--outline-white flex-1 text-xs"
                      onClick={() => openPermissions(group)}
                    >
                      Phân quyền
                    </button>
                  )}
                  {!SYSTEM_GROUPS.has(group.name) && (
                    <button
                      className="rogym-btn rogym-btn--outline-white rogym-btn--nav text-xs"
                      onClick={() => setEditingGroup(group)}
                    >
                      Sửa
                    </button>
                  )}
                  {!SYSTEM_GROUPS.has(group.name) && (
                    <button
                      className="rogym-btn rogym-btn--danger rogym-btn--nav text-xs"
                      onClick={() => handleDelete(group)}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <OwnerPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(undefined)}
          onUpdated={handleGroupUpdated}
        />
      )}

      {permissionsGroup && (
        <PermissionsModal
          group={permissionsGroup}
          allPermissions={allPermissions}
          onClose={() => setPermissionsGroup(undefined)}
          onSaved={() => fetchGroups(page)}
        />
      )}
    </OwnerPage>
  )
}
