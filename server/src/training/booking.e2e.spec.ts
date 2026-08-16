/**
 * Member PT Booking E2E / Integration Tests
 * Runs over real HTTP pipeline with supertest, testing Controller, ValidationPipe, Service, and Error Handling.
 */
import request from 'supertest'
import { Test } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TrainingController } from './training.controller'
import { TrainingService } from './training.service'
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface'
import { PermissionsGuard } from '../common/guards/permissions.guard'

describe('Member PT Booking (Integration / E2E)', () => {
  let app: INestApplication

  const memberUser: AuthenticatedUser = {
    userId: 101n,
    email: 'member@test.com',
    roles: ['member'],
    memberId: 50n,
  }

  const mockTrainingService = {
    getTrainerAvailability: jest.fn(),
    bookSessionByMember: jest.fn(),
    cancelBookingByMember: jest.fn(),
    listSessions: jest.fn(),
    getSession: jest.fn(),
    createSession: jest.fn(),
    updateSession: jest.fn(),
    cancelSession: jest.fn(),
    updateSessionStatus: jest.fn(),
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [
        {
          provide: TrainingService,
          useValue: mockTrainingService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()

    // Attach mock user to every incoming request (simulate JwtAuthGuard)
    app.use((req: any, _res: any, next: any) => {
      req.user = memberUser
      next()
    })

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /training-sessions/trainer-availability', () => {
    it('returns 200 and trainer availability for valid date', async () => {
      const mockResult = {
        date: '2026-08-18',
        trainer: { staffId: '5', fullName: 'Coach Alex', avatarFileId: null },
        slots: [
          {
            slotIndex: 1,
            startTime: '2026-08-18T06:00:00.000Z',
            endTime: '2026-08-18T07:00:00.000Z',
            available: true,
          },
        ],
      }
      mockTrainingService.getTrainerAvailability.mockResolvedValue(mockResult)

      const res = await request(app.getHttpServer())
        .get('/training-sessions/trainer-availability?date=2026-08-18')
        .expect(200)

      expect(res.body).toEqual({
        success: true,
        ...mockResult,
      })
      expect(mockTrainingService.getTrainerAvailability).toHaveBeenCalledWith(
        { date: '2026-08-18' },
        expect.objectContaining({ userId: 101n, memberId: 50n })
      )
    })

    it('returns 400 Bad Request when date format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .get('/training-sessions/trainer-availability?date=18-08-2026')
        .expect(400)

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('date must be in YYYY-MM-DD format')])
      )
      expect(mockTrainingService.getTrainerAvailability).not.toHaveBeenCalled()
    })
  })

  describe('POST /training-sessions/book', () => {
    it('returns 201 and creates booking for valid payload', async () => {
      const payload = {
        startTime: '2026-08-18T09:00:00.000Z',
        endTime: '2026-08-18T10:00:00.000Z',
      }
      const mockCreated = {
        sessionId: '10',
        memberId: '50',
        trainerStaffId: '5',
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: 'scheduled',
      }
      mockTrainingService.bookSessionByMember.mockResolvedValue({ data: mockCreated })

      const res = await request(app.getHttpServer())
        .post('/training-sessions/book')
        .send(payload)
        .expect(201)

      expect(res.body).toEqual({
        success: true,
        data: mockCreated,
      })
      expect(mockTrainingService.bookSessionByMember).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({ userId: 101n, memberId: 50n })
      )
    })

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/training-sessions/book')
        .send({ startTime: '2026-08-18T09:00:00.000Z' })
        .expect(400)

      expect(mockTrainingService.bookSessionByMember).not.toHaveBeenCalled()
    })
  })

  describe('POST /training-sessions/:id/cancel-booking', () => {
    it('returns 200 and cancels booking for valid reason', async () => {
      mockTrainingService.cancelBookingByMember.mockResolvedValue({
        success: true,
        message: 'Buổi tập đã được hủy thành công.',
      })

      const res = await request(app.getHttpServer())
        .post('/training-sessions/10/cancel-booking')
        .send({ reason: 'Bận việc gia đình' })
        .expect(200)

      expect(res.body).toEqual({
        success: true,
        message: 'Buổi tập đã được hủy thành công.',
      })
      expect(mockTrainingService.cancelBookingByMember).toHaveBeenCalledWith(
        10n,
        { reason: 'Bận việc gia đình' },
        expect.objectContaining({ userId: 101n, memberId: 50n })
      )
    })

    it('returns 400 when cancellation reason is too short (< 3 chars)', async () => {
      const res = await request(app.getHttpServer())
        .post('/training-sessions/10/cancel-booking')
        .send({ reason: 'No' })
        .expect(400)

      expect(mockTrainingService.cancelBookingByMember).not.toHaveBeenCalled()
    })
  })
})
