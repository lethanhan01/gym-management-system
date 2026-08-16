import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { attendanceService, type AttendanceLog, type QrTokenResponse } from './attendance.service'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const log = { attendanceId: '1' } as AttendanceLog

describe('attendanceService contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists attendance and preserves the total fallback', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [log] } } as never)

    await expect(attendanceService.getAttendance({ memberId: '10', page: 2 })).resolves.toEqual({
      data: [log], total: 1,
    })
    expect(api.get).toHaveBeenCalledWith('/attendance-logs', { params: { memberId: '10', page: 2 } })
  })

  it('uses the server total when present', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [log], meta: { totalItems: 9 } },
    } as never)

    await expect(attendanceService.getAttendance({})).resolves.toEqual({ data: [log], total: 9 })
  })

  it.each([
    ['2026-04', { from: '2026-04-01', to: '2026-04-30' }],
    ['2025-02', { from: '2025-02-01', to: '2025-02-28' }],
    ['2024-02', { from: '2024-02-01', to: '2024-02-29' }],
  ])('expands month %s to its existing date range', async (month, range) => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } } as never)

    await attendanceService.getAttendance({ month })
    expect(api.get).toHaveBeenCalledWith('/attendance-logs', { params: range })
  })

  it('lets month override explicit from and to values', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } } as never)

    await attendanceService.getAttendance({ month: '2026-04', from: 'old-from', to: 'old-to', pageSize: 20 })
    expect(api.get).toHaveBeenCalledWith('/attendance-logs', {
      params: { from: '2026-04-01', to: '2026-04-30', pageSize: 20 },
    })
  })

  it('keeps malformed month behavior without client validation', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [] } } as never)

    await attendanceService.getAttendance({ month: 'bad' })
    expect(api.get).toHaveBeenCalledWith('/attendance-logs', {
      params: { from: 'bad-undefined-01', to: 'bad-undefined-NaN' },
    })
  })

  it('posts a manual check-in', async () => {
    const payload = { memberCode: 'MEM-1', occurredAt: '2026-08-18T08:00:00.000Z' }
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: log } } as never)

    await expect(attendanceService.manualCheckin(payload)).resolves.toEqual(log)
    expect(api.post).toHaveBeenCalledWith('/attendance/manual-checkin', payload)
  })

  it('gets a QR token', async () => {
    const token = { token: 'abc' } as QrTokenResponse
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: token } } as never)

    await expect(attendanceService.getQrToken()).resolves.toEqual(token)
    expect(api.get).toHaveBeenCalledWith('/attendance/qr-token')
  })

  it('posts a QR check-in', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: log } } as never)

    await expect(attendanceService.qrCheckin('abc')).resolves.toEqual(log)
    expect(api.post).toHaveBeenCalledWith('/attendance/qr-checkin', { token: 'abc' })
  })

  it('checks out an attendance log', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, data: log } } as never)

    await expect(attendanceService.checkout('1', '2026-08-18T09:00:00.000Z')).resolves.toEqual(log)
    expect(api.patch).toHaveBeenCalledWith('/attendance-logs/1/checkout', {
      endedAt: '2026-08-18T09:00:00.000Z',
    })
  })

  it('propagates API errors unchanged', async () => {
    const error = new Error('network')
    vi.mocked(api.get).mockRejectedValue(error)

    await expect(attendanceService.getAttendance({})).rejects.toBe(error)
  })
})
