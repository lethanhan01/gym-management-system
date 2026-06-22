import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search, Wrench } from 'lucide-react'
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
  StaffEmptyState,
  StaffErrorState,
  StaffModal,
  StaffPage,
  StaffPageHeader,
  StaffSelect,
  StaffSkeleton,
  StaffStatusBadge,
  SubmitButton,
} from '@/components/StaffUI'
import { cn } from '@/lib/utils'

function equipmentStatusTone(status: string) {
  if (status === 'active') return 'success'
  if (status === 'repairing') return 'warning'
  if (status === 'broken') return 'danger'
  return 'muted'
}

export default function EquipmentPage() {
  const { t } = useTranslation('staff')

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

  const [selected, setSelected] = useState<Equipment | null>(null)
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportDesc, setReportDesc] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

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
    setReportError(null)
    setReportOpen(true)
  }

  function closeReport() {
    setReportOpen(false)
    setReportError(null)
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
    setReportError(null)
    try {
      await facilityService.createMaintenanceLog(selected.equipmentId, {
        description: reportDesc.trim(),
      })
      closeReport()
      await refreshDetail(selected.equipmentId)
    } catch (err) {
      setReportError(getApiError(err, t('equipment.reportFailed')))
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
      await refreshDetail(selected.equipmentId)
    } catch {
      // silently ignore — user can retry
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
      await refreshDetail(selected.equipmentId)
    } catch {
      // silently ignore — user can retry
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
      await refreshDetail(selected.equipmentId)
    } catch {
      // silently ignore — user can retry
    } finally {
      setUpdatingStatus(false)
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
    <StaffPage>
      <StaffPageHeader
        eyebrow={t('equipment.eyebrow')}
        title={t('equipment.title')}
        description={t('equipment.descriptionWithTotal', { total })}
      />

      <div className="rogym-card rogym-card--compact grid gap-3 p-4 md:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 rogym-text-dim"
            size={17}
          />
          <input
            className="rogym-input pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            placeholder={t('equipment.searchPlaceholder')}
          />
        </div>
        <StaffSelect
          value={statusFilter}
          onValueChange={(value) => updateParam('status', value)}
          ariaLabel={t('equipment.filterByStatus')}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </StaffSelect>
        <StaffSelect
          value={roomId}
          onValueChange={(value) => updateParam('roomId', value)}
          ariaLabel={t('equipment.filterByRoom')}
        >
          <option value="">{t('equipment.allRooms')}</option>
          {rooms.map((r) => (
            <option key={r.roomId} value={r.roomId}>{r.name}</option>
          ))}
        </StaffSelect>
        <button type="button" className="rogym-btn rogym-btn--primary" onClick={applySearch}>
          {t('equipment.search')}
        </button>
      </div>

      {loading ? (
        <StaffSkeleton rows={5} />
      ) : error ? (
        <StaffErrorState message={error} onRetry={load} />
      ) : data.length === 0 ? (
        <StaffEmptyState
          title={t('equipment.noEquipment')}
          description={t('equipment.noEquipmentDesc')}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--rogym-border-teal-dim)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider rogym-text-dim">
                <tr>
                  <th className="px-5 py-4">{t('equipment.colDevice')}</th>
                  <th className="px-5 py-4">{t('equipment.colRoom')}</th>
                  <th className="px-5 py-4">{t('equipment.colWarranty')}</th>
                  <th className="px-5 py-4">{t('equipment.colStatus')}</th>
                  <th className="px-5 py-4 text-right">{t('equipment.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((eq) => (
                  <tr key={eq.equipmentId} className="border-t border-white/5 bg-[var(--rogym-bg-card)]">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{eq.name}</div>
                      <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {eq.roomName ?? t('equipment.notAssignedRoom')}
                    </td>
                    <td className="px-5 py-4 rogym-text-secondary">
                      {formatDate(eq.warrantyUntil)}
                    </td>
                    <td className="px-5 py-4 min-w-0">
                      <span
                        className="rogym-tone-badge"
                        data-tone={equipmentStatusTone(eq.status)}
                      >
                        {equipmentStatusLabel(eq.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="rogym-text-link rogym-text-link--accent"
                        onClick={() => openDetail(eq)}
                      >
                        {t('equipment.detail')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {data.map((eq) => (
              <button
                key={eq.equipmentId}
                type="button"
                className="rogym-card rogym-card--compact rogym-card--interactive w-full p-5 text-left"
                onClick={() => openDetail(eq)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      eq.status === 'broken' ? 'bg-red-400/10 text-red-300' : 'bg-[rgba(66,224,158,0.12)] rogym-text-accent'
                    )}>
                      <Wrench size={19} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{eq.name}</div>
                      <div className="text-xs rogym-text-dim">{eq.equipmentCode}</div>
                    </div>
                  </div>
                  <span className="rogym-tone-badge is-compact" data-tone={equipmentStatusTone(eq.status)}>
                    {equipmentStatusLabel(eq.status)}
                  </span>
                </div>
                <div className="mt-2 text-sm rogym-text-secondary">
                  {eq.roomName ?? t('equipment.notAssignedRoom')}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            {t('equipment.prevPage')}
          </button>
          <span className="text-sm rogym-text-secondary">
            {t('equipment.page', { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            {t('equipment.nextPage')}
          </button>
        </div>
      )}

      {/* Modal chi tiết thiết bị */}
      <StaffModal
        open={!!selected}
        title={selected?.name ?? t('equipment.detailTitle')}
        onClose={closeDetail}
        footer={
          selected ? (
            <>
              <button
                type="button"
                className="rogym-btn rogym-btn--outline-white"
                onClick={closeDetail}
              >
                {t('equipment.close')}
              </button>

              {selected.status === 'active' && (
                <button
                  type="button"
                  className="rogym-btn rogym-btn--danger"
                  onClick={openReport}
                >
                  <AlertTriangle size={15} /> {t('equipment.reportIncident')}
                </button>
              )}

              {selected.status === 'broken' && (
                <button
                  type="button"
                  className="rogym-btn rogym-btn--outline-white"
                  disabled={!!updatingLogId || logsLoading}
                  onClick={handleStartRepair}
                >
                  {updatingLogId ? t('equipment.processing') : t('equipment.startRepair')}
                </button>
              )}

              {selected.status === 'repairing' && (
                <>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--outline-white"
                    disabled={updatingStatus || logsLoading}
                    onClick={handleRetireFromRepairing}
                  >
                    {updatingStatus ? t('equipment.processing') : t('equipment.retire')}
                  </button>
                  <button
                    type="button"
                    className="rogym-btn rogym-btn--primary"
                    disabled={!!updatingLogId || logsLoading}
                    onClick={handleFinishRepair}
                  >
                    {updatingLogId ? t('equipment.processing') : t('equipment.finishRepair')}
                  </button>
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
                <span
                  className="rogym-tone-badge"
                  data-tone={equipmentStatusTone(selected.status)}
                >
                  {equipmentStatusLabel(selected.status)}
                </span>
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
                        <StaffStatusBadge status={log.status} />
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
      </StaffModal>

      {/* Modal báo cáo sự cố */}
      <StaffModal
        open={reportOpen}
        title={t('equipment.reportTitle', { name: selected?.name ?? '' })}
        onClose={closeReport}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={closeReport}
            >
              {t('equipment.cancel')}
            </button>
            <SubmitButton form="report-form" loading={reporting} disabled={!reportDesc.trim()}>
              {t('equipment.sendReport')}
            </SubmitButton>
          </>
        }
      >
        <form id="report-form" className="space-y-4" onSubmit={handleReport}>
          {reportError && <StaffErrorState message={reportError} />}
          <label className="block space-y-2">
            <span className="rogym-field-label">{t('equipment.incidentDesc')}</span>
            <textarea
              className="rogym-input min-h-24"
              value={reportDesc}
              onChange={(event) => setReportDesc(event.target.value)}
              placeholder={t('equipment.incidentPlaceholder')}
              required
            />
          </label>
          <button type="submit" className="hidden" />
        </form>
      </StaffModal>
    </StaffPage>
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
