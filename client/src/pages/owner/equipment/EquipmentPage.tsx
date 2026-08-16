import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import { facilityService, type Equipment, type GymRoom } from '@/services/facility.service'
import {
  Page,
  PageHeader,
  SearchToolbar,
  Select,
  ResponsiveTable,
  Button,
  Modal,
  ConfirmDialog,
  FormField,
  Input,
  DatePickerInput,
  StatusBadge,
  type ColumnDef,
} from '@/components/ui'

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
  const { t } = useTranslation('owner')
  const { t: tCommon } = useTranslation('common')

  const STATUS_OPTIONS = [
    { value: 'active', label: t('equipment.status.active') },
    { value: 'repairing', label: t('equipment.status.repairing') },
    { value: 'broken', label: t('equipment.status.broken') },
    { value: 'retired', label: t('equipment.status.retired') },
  ]

  const STATUS_FILTER_OPTIONS = [{ value: '', label: t('equipment.status.all') }, ...STATUS_OPTIONS]

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
    facilityService
      .listRooms()
      .then(setRooms)
      .catch(() => {})
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
      .catch((err) => setError(getApiError(err, t('equipment.loadFailed'))))
      .finally(() => setLoading(false))
  }, [statusFilter, page, searchParams, t])

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
      setFormError(getApiError(err, t('equipment.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  // ── Confirm delete ──
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openDelete(eq: Equipment) {
    setDeleteTarget(eq)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await facilityService.deleteEquipment(deleteTarget.equipmentId)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setFormError(getApiError(err, t('equipment.deleteFailed')))
    } finally {
      setDeleting(false)
    }
  }

  function handleSearchChange(searchVal: string) {
    setSearch(searchVal)
    const next = new URLSearchParams(searchParams)
    searchVal ? next.set('search', searchVal) : next.delete('search')
    next.set('page', '1')
    setSearchParams(next)
  }

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setSearchParams(next)
  }

  const columns: ColumnDef<Equipment>[] = [
    {
      key: 'code',
      header: t('equipment.table.code'),
      render: (eq) => (
        <span className="font-mono text-xs rogym-text-dim">{eq.equipmentCode}</span>
      ),
    },
    {
      key: 'name',
      header: t('equipment.table.name'),
      render: (eq) => <span className="font-semibold text-white">{eq.name}</span>,
    },
    {
      key: 'room',
      header: t('equipment.table.room'),
      render: (eq) => (
        <span className="rogym-text-secondary">
          {eq.roomName ?? <span className="rogym-text-dim italic">{t('equipment.noRoom')}</span>}
        </span>
      ),
    },
    {
      key: 'importDate',
      header: t('equipment.table.importDate'),
      render: (eq) => (
        <span className="rogym-text-secondary">{formatDate(eq.importDate)}</span>
      ),
    },
    {
      key: 'warrantyUntil',
      header: t('equipment.table.warrantyUntil'),
      render: (eq) => (
        <span className="rogym-text-secondary">{formatDate(eq.warrantyUntil)}</span>
      ),
    },
    {
      key: 'status',
      header: t('equipment.table.status'),
      render: (eq) => <StatusBadge status={eq.status} />,
    },
    {
      key: 'actions',
      header: t('equipment.table.actions'),
      align: 'right',
      render: (eq) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="icon"
            size="compact"
            onClick={() => openEdit(eq)}
            aria-label={tCommon('button.edit')}
          >
            <Edit2 size={15} />
          </Button>
          <Button
            variant="danger"
            size="compact"
            onClick={() => openDelete(eq)}
            aria-label={tCommon('button.delete')}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('equipment.eyebrow')}
        title={t('equipment.title')}
        description={t('equipment.totalCount', { count: total })}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} /> {t('equipment.addEquipment')}
          </Button>
        }
      />

      {/* Filters */}
      <SearchToolbar
        value={search}
        onChange={handleSearchChange}
        placeholder={t('equipment.searchPlaceholder')}
        filters={
          <Select
            className="w-full sm:w-[200px]"
            value={statusFilter}
            onValueChange={(value) => updateParam('status', value)}
            ariaLabel={t('equipment.filterByStatus')}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        }
      />

      {/* Data Table */}
      <ResponsiveTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.equipmentId}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={t('equipment.notFound')}
        emptyDescription={t('equipment.notFoundDesc')}
        emptyAction={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} /> {t('equipment.addEquipment')}
          </Button>
        }
        pagination={
          totalPages > 1
            ? {
                page,
                totalPages,
                onPageChange: (p) => updateParam('page', String(p)),
                totalItems: total,
                pageSize: 15,
                showItemCount: true,
              }
            : undefined
        }
      />

      {/* Modal thêm / chỉnh sửa thiết bị */}
      <Modal
        open={modalOpen}
        title={
          editing ? t('equipment.editTitle', { name: editing.name }) : t('equipment.createTitle')
        }
        onClose={closeModal}
        footer={
          <>
            <Button variant="outline-white" onClick={closeModal}>
              {tCommon('button.cancel')}
            </Button>
            <Button
              type="submit"
              form="equipment-form"
              variant="primary"
              loading={saving}
              disabled={!form.name.trim() || !form.roomId}
            >
              {editing ? t('equipment.saveChanges') : t('equipment.addEquipment')}
            </Button>
          </>
        }
      >
        <form id="equipment-form" className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {formError}
            </div>
          )}

          <FormField label={t('equipment.form.name')} required>
            <Input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t('equipment.form.namePlaceholder')}
              required
            />
          </FormField>

          <FormField label={t('equipment.form.room')} required>
            <Select value={form.roomId} onValueChange={(v) => setField('roomId', v)} required>
              <option value="">{t('equipment.form.selectRoom')}</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('equipment.form.importDate')}>
              <DatePickerInput
                value={form.importDate}
                onChange={(value) => setField('importDate', value)}
                aria-label={t('equipment.form.importDate')}
              />
            </FormField>
            <FormField label={t('equipment.form.warrantyUntil')}>
              <DatePickerInput
                value={form.warrantyUntil}
                onChange={(value) => setField('warrantyUntil', value)}
                aria-label={t('equipment.form.warrantyUntil')}
              />
            </FormField>
          </div>

          {editing && (
            <FormField label={t('equipment.form.status')} required>
              <Select
                value={form.status}
                onValueChange={(v) => setField('status', v)}
                required
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </form>
      </Modal>

      {/* Modal xác nhận xóa */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title={t('equipment.deleteConfirmTitle')}
          variant="danger"
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          description={t('equipment.deleteConfirmMsg', {
            name: deleteTarget.name,
            code: deleteTarget.equipmentCode ?? '',
          })}
          confirmLabel={t('equipment.deleteBtn')}
        />
      )}
    </Page>
  )
}
