import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit2, Trash2, LoaderCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { getApiError, isApiConflict } from '@/lib/api-error'
import { formatVnd } from '@/lib/currency'
import { PACKAGE_STATUS_COLOR, PACKAGE_STATUS_LABEL } from '@/lib/owner-constants'

import packageService, {
  type Package,
  type CreatePackageDto,
  type ListPackagesParams,
  type UpdatePackageDto,
} from '@/services/package.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerBadge,
  OwnerSelect,
  OwnerPagination,
  OwnerSearchInput,
} from '@/components/OwnerUI'

const PAGE_SIZE = 20

function PackageModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg?: Package
  onClose: () => void
  onSaved: (p: Package) => void
}) {
  const isEdit = !!pkg
  const [form, setForm] = useState<CreatePackageDto>({
    name: pkg?.name ?? '',
    durationDays: pkg?.durationDays ?? 30,
    price: pkg ? Number(pkg.price) : 500000,
    benefits: pkg?.benefits ?? '',
    status: pkg?.status ?? 'active',
    includesPt: pkg?.includesPt ?? false,
  })
  useEffect(() => {
    setForm({
      name: pkg?.name ?? '',
      durationDays: pkg?.durationDays ?? 30,
      price: pkg ? Number(pkg.price) : 500000,
      benefits: pkg?.benefits ?? '',
      status: pkg?.status ?? 'active',
      includesPt: pkg?.includesPt ?? false,
    })
  }, [pkg])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || form.durationDays <= 0 || form.price <= 0) {
      setError('Vui lòng điền đầy đủ thông tin hợp lệ.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let saved: Package
      if (isEdit) {
        const payload: UpdatePackageDto = {
          ...(form.name ? { name: form.name } : {}),
          ...(form.durationDays ? { durationDays: form.durationDays } : {}),
          ...(form.price ? { price: form.price } : {}),
          ...(form.benefits !== undefined ? { benefits: form.benefits } : {}),
          ...(form.includesPt !== undefined ? { includesPt: form.includesPt } : {}),
        }
        saved = await packageService.update(pkg.packageId, payload)
        if (form.status && form.status !== pkg.status) {
          saved = await packageService.updateStatus(pkg.packageId, form.status)
        }
      } else {
        saved = await packageService.create(form)
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(getApiError(err, 'Lưu thất bại.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Sửa gói tập' : 'Tạo gói tập mới'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            form="pkg-form"
            className="rogym-btn rogym-btn--primary"
            disabled={saving}
          >
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo gói tập'}
          </button>
        </>
      }
    >
      <form id="pkg-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div>
          <p className="rogym-field-label mb-2 block">Bao gồm Personal Trainer</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, includesPt: true }))}
              className={`rogym-btn ${form.includesPt ? 'rogym-btn--primary' : 'rogym-btn--outline-white'}`}
            >
              Có HLV
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, includesPt: false }))}
              className={`rogym-btn ${!form.includesPt ? 'rogym-btn--primary' : 'rogym-btn--outline-white'}`}
            >
              Không có HLV
            </button>
          </div>
        </div>

        <div>
          <label className="rogym-field-label mb-1.5 block">Tên gói tập *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rogym-input"
            placeholder="Standard 1 tháng"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="rogym-field-label mb-1.5 block">Thời hạn (ngày) *</label>
            <input
              type="number"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))}
              className="rogym-input"
              min={1}
              max={3650}
              required
            />
          </div>
          <div>
            <label className="rogym-field-label mb-1.5 block">Giá (VNĐ) *</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              className="rogym-input"
              min={0}
              required
            />
          </div>
        </div>

        <div>
          <label className="rogym-field-label mb-1.5 block">Quyền lợi</label>
          <textarea
            value={form.benefits ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
            className="rogym-input min-h-[80px] resize-none"
            placeholder="Truy cập phòng tập, locker, voucher..."
          />
        </div>

        {isEdit && (
          <div>
            <label className="rogym-field-label mb-1.5 block">Trạng thái</label>
            <OwnerSelect
              value={form.status ?? 'active'}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'inactive' }))}
              required
            >
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </OwnerSelect>
          </div>
        )}
      </form>
    </Modal>
  )
}

function DeleteConfirmModal({
  pkg,
  onClose,
  onDeleted,
}: {
  pkg: Package
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      if (pkg.status === 'active') {
        await packageService.updateStatus(pkg.packageId, 'inactive')
      } else {
        await packageService.delete(pkg.packageId)
      }
      onDeleted()
      onClose()
    } catch (err) {
      if (isApiConflict(err)) {
        setError('Không thể xóa: gói tập đang có hội viên sử dụng.')
      } else {
        setError(getApiError(err, 'Xóa thất bại.'))
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] p-6">
        <h2 className="mb-2 text-lg font-bold text-white">Xác nhận</h2>
        <p className="mb-5 text-sm rogym-text-secondary">
          {pkg.status === 'active'
            ? `Ngừng bán gói "${pkg.name}"? Hội viên đang sử dụng sẽ không bị ảnh hưởng.`
            : `Xóa vĩnh viễn gói "${pkg.name}"? Hành động không thể hoàn tác.`}
        </p>
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button className="rogym-btn rogym-btn--outline-white" onClick={onClose}>
            Hủy
          </button>
          <button
            className="rogym-btn rogym-btn--danger"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting && <LoaderCircle size={16} className="animate-spin" />}
            {pkg.status === 'active' ? 'Ngừng bán' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ListPackagesParams['status']>('active')

  const [editingPkg, setEditingPkg] = useState<Package | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [deletingPkg, setDeletingPkg] = useState<Package | undefined>()

  const fetchPackages = useCallback(
    async (pg: number) => {
      setLoading(true)
      setError(null)
      try {
        const params: ListPackagesParams = {
          page: pg,
          pageSize: PAGE_SIZE,
          status: statusFilter,
          search: search || undefined,
        }
        const { data, meta } = await packageService.list(params)
        setPackages(data)
        setTotal(meta.total)
      } catch (err) {
        setError(getApiError(err, 'Không thể tải danh sách gói tập.'))
      } finally {
        setLoading(false)
      }
    },
    [search, statusFilter]
  )

  useEffect(() => {
    fetchPackages(page)
  }, [fetchPackages, page])

  function handleFilterChange<T extends string>(setter: (v: T) => void, val: T) {
    setter(val)
    setPage(1)
  }

  function handleSaved(pkg: Package) {
    setPackages((prev) =>
      prev.some((p) => p.packageId === pkg.packageId)
        ? prev.map((p) => (p.packageId === pkg.packageId ? pkg : p))
        : [pkg, ...prev]
    )
    setShowCreate(false)
    setEditingPkg(undefined)
  }

  function handleDeleted() {
    setPackages((prev) => prev.filter((p) => p.packageId !== deletingPkg?.packageId))
    setDeletingPkg(undefined)
    fetchPackages(page)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Cấu hình"
        title="Quản lý gói tập"
        description={`${total} gói tập trên hệ thống`}
        actions={
          <button className="rogym-btn rogym-btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Tạo gói mới
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <OwnerSearchInput
          value={search}
          onChange={(v) => handleFilterChange(setSearch, v)}
          placeholder="Tìm theo tên, mã gói..."
          className="flex-1 min-w-[200px]"
        />
        <OwnerSelect
          value={statusFilter ?? 'active'}
          onValueChange={(value) => {
            setStatusFilter(value as ListPackagesParams['status'])
            setPage(1)
          }}
          className="rogym-select min-w-[160px]"
          required
        >
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </OwnerSelect>
      </div>

      {/* List */}
      {loading ? (
        <OwnerSkeleton rows={6} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={() => fetchPackages(page)} />
      ) : packages.length === 0 ? (
        <OwnerEmptyState
          title="Không có gói tập nào"
          description="Thử thay đổi bộ lọc hoặc tạo gói mới."
          action={
            <button className="rogym-btn rogym-btn--primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Tạo gói mới
            </button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">Mã gói</th>
                  <th className="px-5 py-3 font-medium">Tên gói</th>
                  <th className="px-5 py-3 font-medium">Thời hạn</th>
                  <th className="px-5 py-3 font-medium">Giá</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {packages.map((pkg) => (
                  <tr key={pkg.packageId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs rogym-text-dim">
                      {pkg.packageCode}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{pkg.name}</td>
                    <td className="px-5 py-4 rogym-text-secondary">{pkg.durationDays} ngày</td>
                    <td className="px-5 py-4 font-semibold rogym-text-green">
                      {formatVnd(Number(pkg.price))}
                    </td>
                    <td className="px-5 py-4">
                      <OwnerBadge
                        label={
                          pkg.deletedAt
                            ? 'Đã xóa'
                            : (PACKAGE_STATUS_LABEL[pkg.status] ?? pkg.status)
                        }
                        color={
                          pkg.deletedAt
                            ? '#6b7280'
                            : (PACKAGE_STATUS_COLOR[pkg.status] ?? '#6b7280')
                        }
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="ml-auto grid w-[176px] grid-cols-2 gap-2">
                        {pkg.deletedAt ? (
                          <span className="col-span-2 text-center text-xs rogym-text-dim">
                            Không có thao tác
                          </span>
                        ) : (
                          <>
                            <button
                              className="rogym-btn rogym-btn--outline-white rogym-btn--nav w-full justify-center text-xs"
                              onClick={() => setEditingPkg(pkg)}
                            >
                              <Edit2 size={14} /> Sửa
                            </button>
                            <button
                              className="rogym-btn rogym-btn--danger rogym-btn--nav w-full justify-center text-xs"
                              onClick={() => setDeletingPkg(pkg)}
                            >
                              <Trash2 size={14} />
                              {pkg.status === 'active' ? 'Ngừng' : 'Xóa'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <OwnerPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {(showCreate || editingPkg) && (
        <PackageModal
          pkg={editingPkg}
          onClose={() => {
            setShowCreate(false)
            setEditingPkg(undefined)
          }}
          onSaved={handleSaved}
        />
      )}

      {deletingPkg && (
        <DeleteConfirmModal
          pkg={deletingPkg}
          onClose={() => setDeletingPkg(undefined)}
          onDeleted={handleDeleted}
        />
      )}
    </OwnerPage>
  )
}
