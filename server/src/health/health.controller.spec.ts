import { HealthController } from './health.controller'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  probe: jest.fn(),
} as unknown as PrismaService

const ctrl = new HealthController(mockPrisma)

beforeEach(() => jest.clearAllMocks())

describe('HealthController', () => {
  describe('health', () => {
    it('returns status ok when DB is reachable', async () => {
      (mockPrisma.probe as jest.Mock).mockResolvedValue(true)
      const res = await ctrl.health()
      expect(res.status).toBe('ok')
      expect(res.db).toBe('ok')
      expect(typeof res.timestamp).toBe('string')
    })

    it('returns status degraded when DB query throws', async () => {
      (mockPrisma.probe as jest.Mock).mockResolvedValue(false)
      const res = await ctrl.health()
      expect(res.status).toBe('degraded')
      expect(res.db).toBe('down')
    })

    it('includes ISO timestamp in response', async () => {
      (mockPrisma.probe as jest.Mock).mockResolvedValue(true)
      const before = new Date().toISOString()
      const res = await ctrl.health()
      const after = new Date().toISOString()
      expect(res.timestamp >= before).toBe(true)
      expect(res.timestamp <= after).toBe(true)
    })
  })
})
