import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Building2, Plus, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { facilityService, type GymRoom } from '@/services/facility.service'
import {
  Page,
  PageHeader,
  PageSkeleton,
  PageEmptyState,
  PageErrorState,
  Card,
  Button,
  ButtonLink,
  Modal,
  FormField,
  Input,
  Textarea,
} from '@/components/ui'
import { toast } from '@/lib/toast'

export default function FacilityPage() {
  const { t } = useTranslation('staff')

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

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    facilityService
      .listRoomsPaged({ pageSize: 50 })
      .then((result) => {
        setRooms(result.data)
        setTotal(result.total)
      })
      .catch((err) => setError(getApiError(err, t('facility.loadFailed'))))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormName('')
    setFormType('')
    setFormCapacity('20')
    setFormDesc('')
    setModalOpen(true)
  }

  function openEdit(room: GymRoom) {
    setEditing(room)
    setFormName(room.name)
    setFormType(room.roomType ?? '')
    setFormCapacity(String(room.capacity))
    setFormDesc(room.description ?? '')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!formName.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        roomType: formType.trim() || undefined,
        capacity: Number(formCapacity) || 20,
        description: formDesc.trim() || undefined,
      }
      if (editing) {
        await facilityService.updateRoom(editing.roomId, payload)
        toast.success(t('facility.updateSuccess', { defaultValue: 'Cập nhật phòng tập thành công' }))
      } else {
        await facilityService.createRoom(payload)
        toast.success(t('facility.createSuccess', { defaultValue: 'Thêm phòng tập thành công' }))
      }
      closeModal()
      load()
    } catch (err) {
      toast.error(getApiError(err, t('facility.saveFailed')), {
        action: { label: t('common.retry', { defaultValue: 'Thử lại' }), onClick: () => handleSubmit(event) },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow={t('facility.eyebrow')}
        title={t('facility.title')}
        description={t('facility.descriptionWithTotal', { total })}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} /> {t('facility.addRoom')}
          </Button>
        }
      />

      {loading ? (
        <PageSkeleton rows={4} />
      ) : error ? (
        <PageErrorState message={error} onRetry={load} />
      ) : rooms.length === 0 ? (
        <PageEmptyState
          title={t('facility.noRooms')}
          description={t('facility.noRoomsDesc')}
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus size={15} /> {t('facility.addRoom')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.roomId} variant="compact">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(66,224,158,0.12)] rogym-text-accent">
                <Building2 size={20} />
              </div>
              <div className="font-semibold text-white">{room.name}</div>
              {room.roomCode && (
                <div className="mt-0.5 text-xs rogym-text-dim">{room.roomCode}</div>
              )}
              <div className="mt-3 space-y-1 text-sm rogym-text-secondary">
                {room.roomType && <div>{t('facility.roomType', { type: room.roomType })}</div>}
                <div>{t('facility.capacity', { n: room.capacity })}</div>
                {room.description && (
                  <div className="text-xs rogym-text-dim line-clamp-2">
                    {room.description}
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-3">
                <Button
                  variant="outline-white"
                  size="compact"
                  className="flex-1"
                  onClick={() => openEdit(room)}
                >
                  {t('facility.edit')}
                </Button>
                <ButtonLink
                  variant="outline-green"
                  size="compact"
                  className="flex-1"
                  to={`/staff/equipment?roomId=${room.roomId}`}
                >
                  <Wrench size={14} /> {t('facility.equipment')}
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? t('facility.editModal') : t('facility.createModal')}
        onClose={closeModal}
        footer={
          <>
            <Button variant="outline-white" onClick={closeModal}>
              {t('facility.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="room-form"
              loading={saving}
              disabled={!formName.trim()}
            >
              {editing ? t('facility.saveChanges') : t('facility.createRoom')}
            </Button>
          </>
        }
      >
        <form id="room-form" className="space-y-4" onSubmit={handleSubmit}>
          <FormField label={t('facility.roomName')} required>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              placeholder={t('facility.roomNamePlaceholder')}
            />
          </FormField>

          <FormField label={t('facility.roomTypeLabel')}>
            <Input
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              placeholder={t('facility.roomTypePlaceholder')}
            />
          </FormField>

          <FormField label={t('facility.capacityLabel')} required>
            <Input
              type="number"
              min={1}
              value={formCapacity}
              onChange={(e) => setFormCapacity(e.target.value)}
              required
            />
          </FormField>

          <FormField label={t('facility.description')}>
            <Textarea
              rows={3}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t('facility.descriptionPlaceholder')}
            />
          </FormField>
        </form>
      </Modal>
    </Page>
  )
}
