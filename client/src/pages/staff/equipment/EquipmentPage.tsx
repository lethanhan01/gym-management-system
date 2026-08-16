import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Eye, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getApiError } from '@/lib/api-error'
import { formatDate } from '@/lib/date'
import {
  facilityService,
  type Equipment,
  type GymRoom,
  type MaintenanceLog,
} from '@/services/facility.service'
import {
  Page,
  PageHeader,
  Card,
  SearchToolbar,
  Select,
  ResponsiveTable,
  Button,
  Modal,
  FormField,
  Textarea,
  StatusBadge,
  type ColumnDef,
} from '@/components/ui'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export default function EquipmentPage() {
  const { t } = useTranslation('staff')
  const { t: tCommon } = useTranslation('common')

  const STATUS_OPTIONS = [
    { value: '', label: t('equipment.statusAll') },
    { value: 'active', label: t('equipment.statusActive') },
    { value: 'repairing', label: t('equipment.statusRepairing') },
    { value: 'broken', label: t('equipment.statusBroken') },
    { value: 'retired', label: t('equipment.statusRetired') },
  ]

  function equipmentStatusLabel(status: string) {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  }

  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const roomId = searchParams.get('roomId') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const [data, setData] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rooms, setRooms] = useState<GymRoom[]>([])

  useEffect(() => {
    facilityService.listRooms().then(setRooms).catch(() => {})
  }, [])

  const [selected, setSelected] = useState<Equipment | null>(null)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportDesc, setReportDesc] = useState('')
  const [reporting, setReporting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    facilityService
      .listEquipment({
        status: statusFilter || undefined,
        roomId: roomId || undefined,
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
  }, [statusFilter, roomId, page, searchParams, t])

  useEffect(() => {
    load()
  }, [load])

  async function openDetail(eq: Equipment) {
    setSelected(eq)
    setLogsLoading(true)
    try {
      const logsData = await facilityService.listMaintenanceLogs(eq.equipmentId)
      setLogs(logsData)
    } catch {
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  function closeDetail() {
    setSelected(null)
    setLogs([])
  }

  function openReport() {
    setReportDesc('')
    setReportOpen(true)
  }

  function closeReport() {
    setReportOpen(false)
  }

  async function refreshDetail(equipmentId: string) {
    const [logsData, eq] = await Promise.all([
      facilityService.listMaintenanceLogs(equipmentId),
      facilityService.getEquipment(equipmentId),
    ])
    setLogs(logsData)
    setSelected(eq)
    load()
  }

  async function handleReport(event: FormEvent) {
    event.preventDefault()
    if (!selected || !reportDesc.trim()) return
    setReporting(true)
    try {
      await facilityService.createMaintenanceLog(selected.equipmentId, {
        description: reportDesc.trim(),
      })
      toast.success(t('equipment.reportSuccess', { defaultValue: 'Báo cáo sự cố thành công' }))
      closeReport()
      await refreshDetail(selected.equipmentId)
    } catch (err) {
      toast.error(getApiError(err, t('equipment.reportFailed')), {
        action: { label: t('common.retry', { defaultValue: 'Thử lại' }), onClick: () => handleReport(event) },
      })
    } finally {
      setReporting(false)
    }
  }

  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleStartRepair() {
    if (!selected) return
    const log = logs.find((l) => l.status === 'reported')
    if (!log) return
    setUpdatingLogId(log.maintenanceId)
    try {
      await facilityService.resolveMaintenanceLog(log.maintenanceId, { status: 'repairing' })
      toast.success(t('equipment.repairStarted', { defaultValue: 'Đã bắt đầu sửa chữa' }))
      await refreshDetail(selected.equipmentId)
    } catch (err) {
      toast.error(getApiError(err, t('equipment.actionFailed', { defaultValue: 'Thao tác thất bại' })))
    } finally {
      setUpdatingLogId(null)
    }
  }

  async function handleFinishRepair() {
    if (!selected) return
    const log = logs.find((l) => l.status === 'repairing')
    if (!log) return
    setUpdatingLogId(log.maintenanceId)
    try {
      await facilityService.resolveMaintenanceLog(log.maintenanceId, { status: 'resolved' })
      toast.success(t('equipment.repairFinished', { defaultValue: 'Đã hoàn tất sửa chữa' }))
      await refreshDetail(selected.equipmentId)
    } catch (err) {
      toast.error(getApiError(err, t('equipment.actionFailed', { defaultValue: 'Thao tác thất bại' })))
    } finally {
      setUpdatingLogId(null)
    }
  }

  async function handleRetireFromRepairing() {
    if (!selected) return
    const log = logs.find((l) => l.status === 'repairing')
    if (!log) return
    setUpdatingStatus(true)
    try {
      await facilityService.resolveMaintenanceLog(log.maintenanceId, { status: 'failed' })
      toast.success(t('equipment.retireSuccess', { defaultValue: 'Đã thanh lý thiết bị' }))
      await refreshDetail(selected.equipmentId)
    } catch (err) {
      toast.error(getApiError(err, t('equipment.actionFailed', { defaultValue: 'Thao tác thất bại' })))
    } finally {
      setUpdatingStatus(false)
    }
  }

  function handleSearchChange(searchVal: string) {
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
      key: 'device',
      header: t('equipment.colDevice'),
      render: (eq) => (
        <div>
          <div className="font-semibold text-white">{eq.name}</div>
          <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
        </div>
      ),
    },
    {
      key: 'room',
      header: t('equipment.colRoom'),
      render: (eq) => (
        <span className="rogym-text-secondary">
          {eq.roomName ?? t('equipment.notAssignedRoom')}
        </span>
      ),
    },
    {
      key: 'warranty',
      header: t('equipment.colWarranty'),
      render: (eq) => (
        <span className="rogym-text-secondary">
          {formatDate(eq.warrantyUntil)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('equipment.colStatus'),
      render: (eq) => (
        <StatusBadge status={eq.status} label={equipmentStatusLabel(eq.status)} />
      ),
    },
    {
      key: 'actions',
      header: t('equipment.colActions'),
      align: 'right',
      render: (eq) => (
        <Button
          variant="icon"
          size="compact"
          onClick={() => openDetail(eq)}
          aria-label={tCommon('button.viewDetail')}
        >
          <Eye size={15} />
        </Button>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={t('equipment.eyebrow')}
        title={t('equipment.title')}
        description={t('equipment.descriptionWithTotal', { total })}
      />

      <SearchToolbar
        value={searchParams.get('search') ?? ''}
        onChange={handleSearchChange}
        placeholder={t('equipment.searchPlaceholder')}
        filters={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select
              className="w-full sm:w-[180px]"
              value={statusFilter}
              onValueChange={(value) => updateParam('status', value)}
              ariaLabel={t('equipment.filterByStatus')}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-[180px]"
              value={roomId}
              onValueChange={(value) => updateParam('roomId', value)}
              ariaLabel={t('equipment.filterByRoom')}
            >
              <option value="">{t('equipment.allRooms')}</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>{r.name}</option>
              ))}
            </Select>
          </div>
        }
      />

      <ResponsiveTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.equipmentId}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={t('equipment.noEquipment')}
        emptyDescription={t('equipment.noEquipmentDesc')}
        renderMobileCard={(eq) => (
          <Card
            variant="interactive"
            onClick={() => openDetail(eq)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    eq.status === 'broken'
                      ? 'bg-red-400/10 text-red-300'
                      : 'bg-[rgba(66,224,158,0.12)] rogym-text-accent'
                  )}
                >
                  <Wrench size={19} />
                </div>
                <div>
                  <div className="font-semibold text-white">{eq.name}</div>
                  <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
                </div>
              </div>
              <StatusBadge status={eq.status} label={equipmentStatusLabel(eq.status)} />
            </div>
            <div className="mt-2 text-sm rogym-text-secondary">
              {eq.roomName ?? t('equipment.notAssignedRoom')}
            </div>
          </Card>
        )}
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

      {/* Modal chi tiết thiết bị */}
      <Modal
        open={!!selected}
        title={selected?.name ?? t('equipment.detailTitle')}
        onClose={closeDetail}
        footer={
          selected ? (
            <>
              <Button variant="outline-white" onClick={closeDetail}>
                {t('equipment.close')}
              </Button>

              {selected.status === 'active' && (
                <Button variant="danger" onClick={openReport}>
                  <AlertTriangle size={15} /> {t('equipment.reportIncident')}
                </Button>
              )}

              {selected.status === 'broken' && (
                <Button
                  variant="outline-white"
                  disabled={!!updatingLogId || logsLoading}
                  onClick={handleStartRepair}
                >
                  {updatingLogId ? t('equipment.processing') : t('equipment.startRepair')}
                </Button>
              )}

              {selected.status === 'repairing' && (
                <>
                  <Button
                    variant="outline-white"
                    disabled={updatingStatus || logsLoading}
                    onClick={handleRetireFromRepairing}
                  >
                    {updatingStatus ? t('equipment.processing') : t('equipment.retire')}
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!!updatingLogId || logsLoading}
                    onClick={handleFinishRepair}
                  >
                    {updatingLogId ? t('equipment.processing') : t('equipment.finishRepair')}
                  </Button>
                </>
              )}
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoPair label={t('equipment.deviceCode')} value={selected.equipmentCode} />
              <InfoPair label={t('equipment.room')} value={selected.roomName ?? t('equipment.notAssigned')} />
              <InfoPair label={t('equipment.importDate')} value={formatDate(selected.importDate)} />
              <InfoPair label={t('equipment.warrantyUntil')} value={formatDate(selected.warrantyUntil)} />
              <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <span className="rogym-text-dim">{t('equipment.colStatus')}</span>
                <StatusBadge status={selected.status} label={equipmentStatusLabel(selected.status)} />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold text-white">{t('equipment.maintenanceHistory')}</h3>
              {logsLoading ? (
                <div className="h-16 animate-pulse rounded-xl bg-white/5" />
              ) : logs.length === 0 ? (
                <p className="text-sm rogym-text-dim">{t('equipment.noMaintenance')}</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.maintenanceId}
                      className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-white">{log.description}</div>
                        <StatusBadge status={log.status} />
                      </div>
                      <div className="mt-1 text-xs rogym-text-dim">
                        {formatDate(log.reportedAt)} · {log.reportedByStaff?.fullName ?? t('equipment.unknownStaff')}
                        {log.resolvedAt && ` · ${t('equipment.resolvedAt', { date: formatDate(log.resolvedAt) })}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal báo cáo sự cố */}
      <Modal
        open={reportOpen}
        title={t('equipment.reportTitle', { name: selected?.name ?? '' })}
        onClose={closeReport}
        footer={
          <>
            <Button variant="outline-white" onClick={closeReport}>
              {t('equipment.cancel')}
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="report-form"
              loading={reporting}
              disabled={!reportDesc.trim()}
            >
              {t('equipment.sendReport')}
            </Button>
          </>
        }
      >
        <form id="report-form" className="space-y-4" onSubmit={handleReport}>
          <FormField label={t('equipment.incidentDesc')} required>
            <Textarea
              rows={4}
              value={reportDesc}
              onChange={(event) => setReportDesc(event.target.value)}
              placeholder={t('equipment.incidentPlaceholder')}
              required
            />
          </FormField>
        </form>
      </Modal>
    </Page>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="text-xs rogym-text-dim">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  )
}
