import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { staffService, type ScheduleWithStaff, type StaffProfile } from '@/services/staff.service'
import {
  OwnerErrorState,
  OwnerModal,
  OwnerPage,
  OwnerPageHeader,
  OwnerSkeleton,
  OwnerSubmitButton,
} from '@/components/OwnerUI'
import { Select as OwnerSelect } from '@/components/Select'
import { StaffScheduleCalendar } from '@/components/staff/StaffScheduleCalendar'
import {
  getScheduleMonthRange,
  STAFF_SCHEDULE_SHIFTS,
  type StaffScheduleShift,
} from '@/lib/staff-schedule-calendar'
import { getApiError } from '@/lib/api-error'
import { shiftLabel } from '@/lib/shift'

export default function OwnerSchedulePage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [schedules, setSchedules] = useState<ScheduleWithStaff[]>([])
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addStaffId, setAddStaffId] = useState('')
  const [addShift, setAddShift] = useState<StaffScheduleShift>('morning')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const { targetYear, targetMonth, monthStart, monthEnd } = getScheduleMonthRange(monthOffset)

  const loadSchedules = useCallback(() => {
    setLoading(true)
    setError(null)
    staffService
      .getAllSchedules(monthStart, monthEnd)
      .then(setSchedules)
      .catch((err) => setError(getApiError(err, 'Không thể tải lịch làm việc.')))
      .finally(() => setLoading(false))
  }, [monthStart, monthEnd])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    if (staffList.length > 0) return
    staffService
      .list({ pageSize: 200, position: 'staff' })
      .then((res) => setStaffList(res.data.filter((staff) => staff.position === 'staff')))
      .catch(() => {})
  }, [staffList.length])

  const assignedIdsForSelectedShift = useMemo(() => {
    if (!selectedDate) return new Set<string>()
    return new Set(
      schedules
        .filter((schedule) => schedule.workDate === selectedDate && schedule.shift === addShift)
        .map((schedule) => schedule.staffId)
    )
  }, [addShift, selectedDate, schedules])

  const availableStaff = useMemo(
    () => staffList.filter((staff) => !assignedIdsForSelectedShift.has(staff.staffId)),
    [assignedIdsForSelectedShift, staffList]
  )

  function openAdd() {
    setAddStaffId('')
    setAddShift('morning')
    setAddError(null)
    setAddOpen(true)
  }

  async function handleAdd() {
    if (!selectedDate || !addStaffId) return
    setAdding(true)
    setAddError(null)
    try {
      await staffService.createSchedules(addStaffId, [{ shift: addShift, workDate: selectedDate }])
      setAddOpen(false)
      loadSchedules()
    } catch (err) {
      setAddError(getApiError(err, 'Không thể thêm lịch.'))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(schedule: ScheduleWithStaff) {
    setDeleting((prev) => new Set(prev).add(schedule.scheduleId))
    try {
      await staffService.deleteSchedule(schedule.staffId, schedule.scheduleId)
      setSchedules((prev) => prev.filter((item) => item.scheduleId !== schedule.scheduleId))
    } catch (err) {
      alert(getApiError(err, 'Không thể xóa lịch.'))
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(schedule.scheduleId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <OwnerPage>
        <OwnerSkeleton />
      </OwnerPage>
    )
  }

  if (error) {
    return (
      <OwnerPage>
        <OwnerErrorState message={error} onRetry={loadSchedules} />
      </OwnerPage>
    )
  }

  return (
    <OwnerPage>
      <OwnerPageHeader
        eyebrow="Quản lý nhân sự"
        title="Lịch phân công"
        description="Xem và phân ca làm việc cho nhân viên theo tháng."
      />

      <StaffScheduleCalendar
        schedules={schedules}
        targetYear={targetYear}
        targetMonth={targetMonth}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        onPreviousMonth={() => setMonthOffset((offset) => offset - 1)}
        onNextMonth={() => setMonthOffset((offset) => offset + 1)}
        detailEyebrow="Nhân sự ngày"
        emptyDayMessage="Chưa có nhân viên nào trong ngày này."
        emptyDayAction={
          <button
            type="button"
            className="rogym-btn rogym-btn--outline-white text-xs"
            onClick={openAdd}
          >
            <Plus size={13} /> Thêm nhân viên
          </button>
        }
        emptyShiftMessage="Chưa có nhân viên"
        headerAction={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary rogym-btn--sm text-xs"
            onClick={openAdd}
          >
            <Plus size={13} /> Thêm
          </button>
        }
        renderEntry={(schedule) => (
          <div className="group flex items-center justify-between gap-2 rounded-lg bg-[rgba(66,224,158,0.08)] px-3 py-2">
            <div>
              <span className="text-sm font-medium text-white">{schedule.fullName}</span>
              {schedule.staffCode && (
                <span className="ml-2 text-xs rogym-text-dim">{schedule.staffCode}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(schedule)}
              disabled={deleting.has(schedule.scheduleId)}
              className="shrink-0 text-white/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
              aria-label={`Xóa ${schedule.fullName}`}
            >
              <X size={13} />
            </button>
          </div>
        )}
      />

      <OwnerModal
        open={addOpen}
        title={
          selectedDate
            ? `Thêm nhân viên - ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
                'vi-VN',
                { day: '2-digit', month: '2-digit', year: 'numeric' }
              )}`
            : 'Thêm nhân viên'
        }
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="rogym-btn rogym-btn--outline-white"
              onClick={() => setAddOpen(false)}
            >
              Hủy
            </button>
            <OwnerSubmitButton form="add-schedule-form" loading={adding} disabled={!addStaffId}>
              Thêm
            </OwnerSubmitButton>
          </>
        }
      >
        <form
          id="add-schedule-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleAdd()
          }}
        >
          {addError && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {addError}
            </div>
          )}
          {availableStaff.length === 0 ? (
            <p className="text-sm rogym-text-dim">
              Tất cả nhân viên đã được phân ca này trong ngày đã chọn.
            </p>
          ) : (
            <>
              <label className="block space-y-2">
                <span className="rogym-field-label">Ca làm việc</span>
                <OwnerSelect
                  value={addShift}
                  onValueChange={(value) => setAddShift(value as StaffScheduleShift)}
                  required
                >
                  {STAFF_SCHEDULE_SHIFTS.map((shift) => (
                    <option key={shift} value={shift}>
                      {shiftLabel(shift)}
                    </option>
                  ))}
                </OwnerSelect>
              </label>
              <label className="block space-y-2">
                <span className="rogym-field-label">Nhân viên</span>
                <OwnerSelect value={addStaffId} onValueChange={setAddStaffId} required>
                  <option value="">-- Chọn nhân viên --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.staffId} value={staff.staffId}>
                      {staff.fullName} ({staff.staffCode})
                    </option>
                  ))}
                </OwnerSelect>
              </label>
            </>
          )}
          <button type="submit" className="hidden" />
        </form>
      </OwnerModal>
    </OwnerPage>
  )
}
