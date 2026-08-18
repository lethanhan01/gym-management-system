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

    expect(controller.sample({ type: 'flex' })).toEqual({ success: true })
    expect(controller.sample({ type: 'rich-menu', locale: 'ja' })).toEqual({ success: true })
    expect(controller.sample({ type: 'pt-booking-created' })).toEqual({ success: true })
    expect(controller.sample({ type: 'pt-reminder-30m', locale: 'ja' })).toEqual({ success: true })
    expect(controller.sample({ type: 'pt-session-cancelled' })).toEqual({ success: true })

    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(1, 'flex', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(2, 'rich-menu', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(3, 'pt-booking-created', 'vi')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(4, 'pt-reminder-30m', 'ja')
    expect(lineMessaging.createMockSample).toHaveBeenNthCalledWith(5, 'pt-session-cancelled', 'vi')

    expect(() => controller.sample({ type: 'text' })).toThrow(NotFoundException)
  })

  it('hides endpoints when mock mode is disabled', () => {
    lineMessaging.isMockEnabled.mockReturnValue(false)
    const controller = new LineMockController(lineMessaging as unknown as LineMessagingService)

    expect(() => controller.messages()).toThrow(NotFoundException)
    expect(() => controller.sample({ type: 'flex' })).toThrow(NotFoundException)
  })
})
