import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Plus, Wrench } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { facilityService, type GymRoom } from '@/services/facility.service'
import {
  StaffEmptyState,
  StaffErrorState,
  StaffModal,
  StaffPage,
  StaffPageHeader,
  StaffSkeleton,
  SubmitButton,
} from '@/components/StaffUI'

export default function FacilityPage() {
  const [rooms, setRooms] = useState<GymRoom[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GymRoom | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('')
  const [formCapacity, setFormCapacity] = useState('20')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    facilityService
      .listRoomsPaged({ pageSize: 50 })
      .then((result) => {
        setRooms(result.data)
        setTotal(result.total)
      })
      .catch((err) => setError(getApiError(err, 'Không thể tải danh sách phòng tập.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormName('')
    setFormType('')
    setFormCapacity('20')
    setFormDesc('')
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(room: GymRoom) {
    setEditing(room)
    setFormName(room.name)
    setFormType(room.roomType ?? '')
    setFormCapacity(String(room.capacity))
    setFormDesc(room.description ?? '')
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: formName.trim(),
        roomType: formType.trim() || undefined,
        capacity: Number(formCapacity) || 20,
        description: formDesc.trim() || undefined,
      }
      if (editing) {
        await facilityService.updateRoom(editing.roomId, payload)
      } else {
        await facilityService.createRoom(payload)
      }
      closeModal()
      load()
    } catch (err) {
      setFormError(getApiError(err, 'Không thể lưu phòng tập.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <StaffPage>
      <StaffPageHeader
        eyebrow="Cơ sở vật chất"
        title="Quản lý phòng tập"
        description={`${total} phòng trong hệ thống.`}
        actions={
          <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Thêm phòng
          </button>
        }
      />

      {loading ? (
        <StaffSkeleton rows={4} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={load} />
      ) : rooms.length === 0 ? (
        <StaffEmptyState
          title="Chưa có phòng nào"
          description="Thêm phòng tập đầu tiên."
          action={
            <button type="button" className="rogym-btn rogym-btn--primary" onClick={openCreate}>
              <Plus size={15} /> Thêm phòng
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.roomId} className="rogym-card rogym-card--compact p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <Building2 size={20} />
              </div>
              <div className="font-semibold text-white">{room.name}</div>
              {room.roomCode && (
                <div className="mt-0.5 text-xs rogym-text-dim">{room.roomCode}</div>
              )}
              <div className="mt-3 space-y-1 text-sm rogym-text-secondary">
                {room.roomType && <div>Loại: {room.roomType}</div>}
                <div>Sức chứa: {room.capacity} người</div>
                {room.description && (
                  <div className="text-xs rogym-text-dim line-clamp-2">
                    {room.description}
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white flex-1 text-sm"
                  onClick={() => openEdit(room)}
                >
                  Chỉnh sửa
                </button>
                <Link
                  className="rogym-btn rogym-btn--outline-green flex-1 text-sm"
                  to={`/staff/equipment?roomId=${room.roomId}`}
                >
                  <Wrench size={14} /> Thiết bị
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <StaffModal
        open={modalOpen}
        title={editing ? 'Chỉnh sửa phòng tập' : 'Thêm phòng tập'}
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={closeModal}
            >
              Hủy
            </button>
            <SubmitButton form="room-form" loading={saving} disabled={!formName.trim()}>
              {editing ? 'Lưu thay đổi' : 'Tạo phòng'}
            </SubmitButton>
          </>
        }
      >
        <form id="room-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && <StaffErrorState message={formError} />}
          <label className="block space-y-2">
            <span className="rogym-field-label">Tên phòng *</span>
            <input
              className="rogym-input"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              required
              placeholder="VD: Phòng gym chính"
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Loại phòng</span>
            <input
              className="rogym-input"
              value={formType}
              onChange={(event) => setFormType(event.target.value)}
              placeholder="VD: gym, yoga, cardio"
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Sức chứa (người)</span>
            <input
              className="rogym-input"
              type="number"
              min={1}
              value={formCapacity}
              onChange={(event) => setFormCapacity(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="rogym-field-label">Mô tả</span>
            <textarea
              className="rogym-input min-h-20"
              value={formDesc}
              onChange={(event) => setFormDesc(event.target.value)}
              placeholder="Mô tả ngắn về phòng tập..."
            />
          </label>
          <button type="submit" className="hidden" />
        </form>
      </StaffModal>
    </StaffPage>
  )
}
