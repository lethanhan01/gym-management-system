import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { memberProgressService } from './member-progress.service'

vi.mock('./api', () => ({ default: { get: vi.fn() } }))

describe('memberProgressService contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('forwards query params and normalizes progress values with existing Number semantics', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: [
          { progressId: '1', weight: null, height: '170', bmi: 22.5 },
          { progressId: '2', weight: 'bad', height: '', bmi: 'NaN' },
        ],
      },
    } as never)

    await expect(memberProgressService.listProgress('10', { from: '2026-01-01', limit: '2' })).resolves.toEqual([
      { progressId: '1', weight: null, height: 170, bmi: 22.5 },
      { progressId: '2', weight: null, height: 0, bmi: null },
    ])
    expect(api.get).toHaveBeenCalledWith('/members/10/progress', {
      params: { from: '2026-01-01', limit: '2' },
    })
  })

  it('propagates API errors unchanged', async () => {
    const error = new Error('network')
    vi.mocked(api.get).mockRejectedValue(error)

    await expect(memberProgressService.listProgress('10')).rejects.toBe(error)
  })
})
