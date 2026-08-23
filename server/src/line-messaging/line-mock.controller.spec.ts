import { NotFoundException } from '@nestjs/common'
import { LineMockController } from './line-mock.controller'
import { LineMessagingService } from './line-messaging.service'

describe('LineMockController', () => {
  const lineMessaging = {
    isMockEnabled: jest.fn(),
    getMockMessages: jest.fn(),
    clearMockMessages: jest.fn(),
    simulateMockEvent: jest.fn(),
    createMockSample: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    lineMessaging.isMockEnabled.mockReturnValue(true)
  })

  it('exposes and clears the in-memory outbox only in mock mode', () => {
    lineMessaging.getMockMessages.mockReturnValue([{ id: '1' }])
    const controller = new LineMockController(lineMessaging as unknown as LineMessagingService)

    expect(controller.messages()).toEqual({ success: true, data: { messages: [{ id: '1' }] } })
    expect(controller.clearMessages()).toEqual({ success: true })
    expect(lineMessaging.clearMockMessages).toHaveBeenCalledTimes(1)
  })

  it('only accepts follow and unfollow events', async () => {
    lineMessaging.simulateMockEvent.mockResolvedValue({ data: { processedEvents: 1 } })
    const controller = new LineMockController(lineMessaging as unknown as LineMessagingService)

    await expect(controller.event({ type: 'follow' })).resolves.toEqual({
      success: true,
      data: { processedEvents: 1 },
    })
    await expect(controller.event({ type: 'message' })).rejects.toBeInstanceOf(NotFoundException)
  })

  it('creates only supported visual samples', () => {
    const controller = new LineMockController(lineMessaging as unknown as LineMessagingService)

    const samples: Array<{ type: string; locale?: string }> = [
      { type: 'flex' },
      { type: 'rich-menu', locale: 'ja' },
      { type: 'pt-booking-created' },
      { type: 'pt-booking-updated', locale: 'ja' },
      { type: 'pt-booking-cancelled' },
      { type: 'pt-session-cancelled', locale: 'ja' },
      { type: 'pt-reminder-30m' },
      { type: 'pt-session-starting', locale: 'ja' },
      { type: 'pt-training-completed' },
      { type: 'attendance-checkin', locale: 'ja' },
      { type: 'subscription-expiring' },
      { type: 'payment-success', locale: 'ja' },
      { type: 'feedback-responded' },
      { type: 'welcome', locale: 'ja' },
      { type: 'help' },
    ]

    samples.forEach((s) => {
      expect(controller.sample(s)).toEqual({ success: true })
    })

    expect(lineMessaging.createMockSample).toHaveBeenCalledTimes(samples.length)
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(1, 'flex', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(2, 'rich-menu', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(3, 'pt-booking-created', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(4, 'pt-booking-updated', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(5, 'pt-booking-cancelled', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(6, 'pt-session-cancelled', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(7, 'pt-reminder-30m', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(8, 'pt-session-starting', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(9, 'pt-training-completed', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(10, 'attendance-checkin', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(11, 'subscription-expiring', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(12, 'payment-success', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(13, 'feedback-responded', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(14, 'welcome', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(15, 'help', 'vi')

    expect(() => controller.sample({ type: 'text' })).toThrow(NotFoundException)
  })

  it('hides endpoints when mock mode is disabled', () => {
    lineMessaging.isMockEnabled.mockReturnValue(false)
    const controller = new LineMockController(lineMessaging as unknown as LineMessagingService)

    expect(() => controller.messages()).toThrow(NotFoundException)
    expect(() => controller.sample({ type: 'flex' })).toThrow(NotFoundException)
  })
})
