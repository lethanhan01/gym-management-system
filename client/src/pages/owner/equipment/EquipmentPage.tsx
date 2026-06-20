import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit2, Plus, Search, Trash2 } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { DatePickerInput } from '@/components/DatePickerInput'
import {
  facilityService,
  type Equipment,
  type GymRoom,
} from '@/services/facility.service'
import {
  OwnerEmptyState,
  OwnerErrorState,
  OwnerModal,
  OwnerPage,
  OwnerPageHeader,
  OwnerSelect,
  OwnerSkeleton,
  OwnerStatusBadge,
  OwnerSubmitButton,
} from '@/components/OwnerUI'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'repairing', label: 'Đang sửa chữa' },
  { value: 'broken', label: 'Hỏng' },
  { value: 'retired', label: 'Ngừng sử dụng' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Mọi trạng thái' },
  ...STATUS_OPTIONS,
]

type FormState = {
  name: string
  roomId: string
  importDate: string
  warrantyUntil: string
  status: string
}

const EMPTY_FORM: FormState = {
  name: '',
  roomId: '',
  importDate: '',
  warrantyUntil: '',
  status: 'active',
}

function equipmentToForm(eq: Equipment): FormState {
  return {
    name: eq.name,
    roomId: eq.roomId ?? '',
    importDate: eq.importDate?.slice(0, 10) ?? '',
    warrantyUntil: eq.warrantyUntil?.slice(0, 10) ?? '',
    status: eq.status,
  }
}

export default function EquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page') ?? 1)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const [data, setData] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rooms, setRooms] = useState<GymRoom[]>([])

  useEffect(() => {
    facilityService.listRooms().then(setRooms).catch(() => {})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    facilityService
      .listEquipment({
        status: statusFilter || undefined,
        search: searchParams.get('search') ?? undefined,
        page,
        pageSize: 15,
      })
      .then((result) => {
        setData(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải danh sách thiết bị.')))
      .finally(() => setLoading(false))
  }, [statusFilter, page, searchParams])

  useEffect(() => {
    load()
  }, [load])

  // ── Modal create/edit ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(eq: Equipment) {
    setEditing(eq)
    setForm(equipmentToForm(eq))
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFormError(null)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await facilityService.updateEquipment(editing.equipmentId, {
          name: form.name.trim(),
          roomId: form.roomId || undefined,
          importDate: form.importDate || undefined,
          warrantyUntil: form.warrantyUntil || undefined,
          status: form.status,
        })
      } else {
        await facilityService.createEquipment({
          name: form.name.trim(),
          roomId: form.roomId || undefined,
          importDate: form.importDate || undefined,
          warrantyUntil: form.warrantyUntil || undefined,
        })
      }
      closeModal()
      load()
    } catch (err) {
      setFormError(getApiError(err, 'Không thể lưu thiết bị.'))
    } finally {
      setSaving(false)
    }
  }

  // ── Confirm delete ──
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openDelete(eq: Equipment) {
    setDeleteTarget(eq)
    setDeleteError(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await facilityService.deleteEquipment(deleteTarget.equipmentId)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(getApiError(err, 'Không thể xóa thiết bị.'))
    } finally {
      setDeleting(false)
    }
  }

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
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Cơ sở vật chất"
        title="Quản lý thiết bị"
        description={`${total} thiết bị trong hệ thống.`}
        actions={
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Thêm thiết bị
          </button>
        }
      />

      {/* Filters */}
      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_200px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim" size={17} />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Tìm theo tên thiết bị hoặc mã"
          />
        </div>
        <OwnerSelect
          value={statusFilter}
          onValueChange={(value) => updateParam('status', value)}
          ariaLabel="Lọc theo trạng thái"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </OwnerSelect>
        <button type="button" className="rogym-btn rogym-btn--primary" onClick={applySearch}>
          Tìm
        </button>
      </div>

      {loading ? (
        <OwnerSkeleton rows={5} />
      ) : error ? (
        <OwnerErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <OwnerEmptyState
          title="Không tìm thấy thiết bị"
          description="Thử thay đổi bộ lọc hoặc thêm thiết bị mới."
          action={
            <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
              <Plus size={15} /> Thêm thiết bị
            </button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs rogym-text-dim">
                  <th className="px-5 py-3 font-medium">Mã</th>
                  <th className="px-5 py-3 font-medium">Tên thiết bị</th>
                  <th className="px-5 py-3 font-medium">Phòng</th>
                  <th className="px-5 py-3 font-medium">Ngày mua</th>
                  <th className="px-5 py-3 font-medium">Hết bảo hành</th>
                  <th className="px-5 py-3 font-medium">Trạng thái</th>
                  <th className="px-5 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((eq) => (
                  <tr key={eq.equipmentId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs rogym-text-dim">
                      {eq.equipmentCode}
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{eq.name}</td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {eq.roomName ?? <span className="rogym-text-dim italic">Chưa phân phòng</span>}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {formatDate(eq.importDate)}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {formatDate(eq.warrantyUntil)}
                    </td>
                    <td className="px-5 py-4">
                      <OwnerStatusBadge status={eq.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--outline-white rogym-btn--nav"
                          onClick={() => openEdit(eq)}
                        >
                          <Edit2 size={14} /> Sửa
                        </button>
                        <button
                          type="button"
                          className="rogym-btn rogym-btn--danger rogym-btn--nav"
                          onClick={() => openDelete(eq)}
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                Trước
              </button>
              <span className="text-sm rogym-text-secondary">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                disabled={page >= totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal thêm / chỉnh sửa thiết bị */}
      <OwnerModal
        open={modalOpen}
        title={editing ? `Chỉnh sửa: ${editing.name}` : 'Thêm thiết bị mới'}
        onClose={closeModal}
        footer={
          <>
            <button type="button" className="rogym-btn rogym-btn--outline-white" onClick={closeModal}>
              Hủy
            </button>
            <OwnerSubmitButton form="equipment-form" loading={saving} disabled={!form.name.trim() || !form.roomId}>
              {editing ? 'Lưu thay đổi' : 'Thêm thiết bị'}
            </OwnerSubmitButton>
          </>
        }
      >
        <form id="equipment-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {formError}
            </div>
          )}

          <label className="block space-y-2">
            <span className="rogym-field-label">Tên thiết bị *</span>
            <input
              className="rogym-input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="VD: Máy chạy bộ Technogym"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="rogym-field-label">Phòng *</span>
            <OwnerSelect
              value={form.roomId}
              onValueChange={(v) => setField('roomId', v)}
              required
            >
              <option value="">-- Chọn phòng --</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>{r.name}</option>
              ))}
            </OwnerSelect>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="rogym-field-label">Ngày mua</span>
              <DatePickerInput
                value={form.importDate}
                onChange={(value) => setField('importDate', value)}
                aria-label="Ngày mua thiết bị"
              />
            </label>
            <label className="block space-y-2">
              <span className="rogym-field-label">Hết bảo hành</span>
              <DatePickerInput
                value={form.warrantyUntil}
                onChange={(value) => setField('warrantyUntil', value)}
                aria-label="Ngày hết bảo hành thiết bị"
              />
            </label>
          </div>

          {editing && (
            <label className="block space-y-2">
              <span className="rogym-field-label">Trạng thái</span>
              <OwnerSelect
                value={form.status}
                onValueChange={(v) => setField('status', v)}
                required
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </OwnerSelect>
            </label>
          )}

          <button type="submit" className="hidden" />
        </form>
      </OwnerModal>

      {/* Modal xác nhận xóa */}
      {deleteTarget && (
        <OwnerModal
          open={!!deleteTarget}
          title="Xác nhận xóa thiết bị"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rogym-btn rogym-btn--danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Đang xóa...' : 'Xóa thiết bị'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            {deleteError && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
                {deleteError}
              </div>
            )}
            <p className="text-sm rogym-text-secondary">
              Bạn có chắc muốn xóa thiết bị{' '}
              <strong className="text-white">{deleteTarget.name}</strong>
              {deleteTarget.equipmentCode && (
                <span className="rogym-text-dim"> ({deleteTarget.equipmentCode})</span>
              )}
              ? Hành động này không thể hoàn tác.
            </p>
          </div>
        </OwnerModal>
      )}
    </OwnerPage>
  )
}
