import { InternalServerErrorException } from '@nestjs/common'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

const mockService = {
  revenue: jest.fn(),
  members: jest.fn(),
  renewals: jest.fn(),
  staffPerformance: jest.fn(),
} as unknown as ReportsService

const ctrl = new ReportsController(mockService)

beforeEach(() => jest.clearAllMocks())

describe('ReportsController', () => {
  describe('revenue', () => {
    it('delegates to revenue service and wraps success', async () => {
      const serviceResult = {
        data: { total: '1000000', breakdown: [] },
        meta: { from: '2025-01-01', to: '2025-01-31' },
      }
      ;(mockService.revenue as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01', to: '2025-01-31' } as any
      const res = await ctrl.revenue(query)
      expect(mockService.revenue).toHaveBeenCalledWith('2025-01-01', '2025-01-31', undefined)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('works with no date range (undefined)', async () => {
      const serviceResult = { data: { total: '0', breakdown: [] }, meta: {} }
      ;(mockService.revenue as jest.Mock).mockResolvedValue(serviceResult)
      const res = await ctrl.revenue({} as any)
      expect(mockService.revenue).toHaveBeenCalledWith(undefined, undefined, undefined)
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('propagates InternalServerErrorException', async () => {
      (mockService.revenue as jest.Mock).mockRejectedValue(new InternalServerErrorException())
      await expect(ctrl.revenue({} as any)).rejects.toBeInstanceOf(InternalServerErrorException)
    })
  })

  describe('members', () => {
    it('delegates to members service and wraps success', async () => {
      const serviceResult = { data: { total: 50, new: 5, active: 40 }, meta: {} }
      ;(mockService.members as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01', to: '2025-01-31' } as any
      const res = await ctrl.members(query)
      expect(mockService.members).toHaveBeenCalledWith('2025-01-01', '2025-01-31')
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('renewals', () => {
    it('delegates to renewals service and wraps success', async () => {
      const serviceResult = { data: { count: 10, rate: 0.75 }, meta: {} }
      ;(mockService.renewals as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01', to: '2025-01-31' } as any
      const res = await ctrl.renewals(query)
      expect(mockService.renewals).toHaveBeenCalledWith('2025-01-01', '2025-01-31')
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })

  describe('staffPerformance', () => {
    it('delegates to staffPerformance service with all params', async () => {
      const serviceResult = { data: { sessions: 20, cancellations: 2 }, meta: {} }
      ;(mockService.staffPerformance as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01', to: '2025-01-31', staffId: '3' } as any
      const res = await ctrl.staffPerformance(query)
      expect(mockService.staffPerformance).toHaveBeenCalledWith('2025-01-01', '2025-01-31', '3')
      expect(res).toEqual({ success: true, ...serviceResult })
    })

    it('works without staffId filter', async () => {
      const serviceResult = { data: [], meta: {} }
      ;(mockService.staffPerformance as jest.Mock).mockResolvedValue(serviceResult)
      const query = { from: '2025-01-01', to: '2025-01-31' } as any
      const res = await ctrl.staffPerformance(query)
      expect(mockService.staffPerformance).toHaveBeenCalledWith(
        '2025-01-01',
        '2025-01-31',
        undefined
      )
      expect(res).toEqual({ success: true, ...serviceResult })
    })
  })
})
