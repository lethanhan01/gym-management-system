import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { trainingSessionService, type TrainingSession } from './training-session.service'

vi.mock('./api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const session = { sessionId: '1' } as TrainingSession

describe('trainingSessionService contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists sessions and preserves the total fallback', async () => {
    const params = { memberId: '10', status: 'scheduled', page: 2, pageSize: 5 }
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [session] } } as never)

    await expect(trainingSessionService.getSessions(params)).resolves.toEqual({ data: [session], total: 1 })
    expect(api.get).toHaveBeenCalledWith('/training-sessions', { params })
  })

  it('uses the server total when present', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [session], meta: { totalItems: 8 } },
    } as never)

    await expect(trainingSessionService.getSessions({})).resolves.toEqual({ data: [session], total: 8 })
  })

  it('gets a session detail', async () => {
    const detail = { ...session, attendanceLogs: [] }
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: detail } } as never)

    await expect(trainingSessionService.getSession('1')).resolves.toEqual(detail)
    expect(api.get).toHaveBeenCalledWith('/training-sessions/1')
  })

  it('creates a session', async () => {
    const payload = {
      memberId: '10', roomId: '3', startTime: '2026-08-18T08:00:00.000Z', endTime: '2026-08-18T09:00:00.000Z',
    }
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: session } } as never)

    await expect(trainingSessionService.createSession(payload)).resolves.toEqual(session)
    expect(api.post).toHaveBeenCalledWith('/training-sessions', payload)
  })

  it('updates a session', async () => {
    const payload = { roomId: '4' }
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, data: session } } as never)

    await expect(trainingSessionService.updateSession('1', payload)).resolves.toEqual(session)
    expect(api.patch).toHaveBeenCalledWith('/training-sessions/1', payload)
  })

  it('cancels a session', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as never)

    await expect(trainingSessionService.cancelSession('1', 'travel')).resolves.toBeUndefined()
    expect(api.post).toHaveBeenCalledWith('/training-sessions/1/cancel', { reason: 'travel' })
  })

  it('updates session status', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: session } } as never)

    await expect(trainingSessionService.updateSessionStatus('1', 'completed')).resolves.toEqual(session)
    expect(api.post).toHaveBeenCalledWith('/training-sessions/1/status', { status: 'completed' })
  })

  it.each([
    ['direct', { date: '2026-08-18', trainer: {}, slots: [] }],
    ['wrapped', { success: true, data: { date: '2026-08-18', trainer: {}, slots: [] } }],
  ])('supports %s trainer availability responses', async (_label, response) => {
    vi.mocked(api.get).mockResolvedValue({ data: response } as never)

    await expect(trainingSessionService.getTrainerAvailability('2026-08-18')).resolves.toEqual(
      'data' in response ? response.data : response
    )
    expect(api.get).toHaveBeenCalledWith('/training-sessions/trainer-availability', {
      params: { date: '2026-08-18' },
    })
  })

  it('books a session', async () => {
    const payload = { startTime: '2026-08-18T08:00:00.000Z', endTime: '2026-08-18T09:00:00.000Z', assignmentId: '2' }
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: session } } as never)

    await expect(trainingSessionService.bookSession(payload)).resolves.toEqual(session)
    expect(api.post).toHaveBeenCalledWith('/training-sessions/book', payload)
  })

  it('cancels a member booking', async () => {
    const response = { success: true, message: 'Cancelled' }
    vi.mocked(api.post).mockResolvedValue({ data: response } as never)

    await expect(trainingSessionService.cancelBooking('1', 'travel')).resolves.toEqual(response)
    expect(api.post).toHaveBeenCalledWith('/training-sessions/1/cancel-booking', { reason: 'travel' })
  })

  it('propagates API errors unchanged', async () => {
    const error = new Error('network')
    vi.mocked(api.get).mockRejectedValue(error)

    await expect(trainingSessionService.getSession('1')).rejects.toBe(error)
  })
})
