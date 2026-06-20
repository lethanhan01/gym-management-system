import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DeviceApiKeyGuard } from './device-api-key.guard'

function makeContext(key?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: key ? { 'x-device-api-key': key } : {} }),
    }),
  } as ExecutionContext
}

describe('DeviceApiKeyGuard', () => {
  const config = { get: jest.fn() }
  const guard = new DeviceApiKeyGuard(config as unknown as ConfigService)

  beforeEach(() => jest.clearAllMocks())

  it('rejects a request without the x-device-api-key header', () => {
    config.get.mockReturnValue('expected-key')

    expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException)
  })

  it('rejects a request when DEVICE_API_KEY is not configured', () => {
    config.get.mockReturnValue(undefined)

    expect(() => guard.canActivate(makeContext('provided-key'))).toThrow(UnauthorizedException)
  })

  it('rejects keys with a different byte length before timing-safe comparison', () => {
    config.get.mockReturnValue('expected-key')

    expect(() => guard.canActivate(makeContext('short'))).toThrow(UnauthorizedException)
  })

  it('rejects a same-length but incorrect key', () => {
    config.get.mockReturnValue('expected-key')

    expect(() => guard.canActivate(makeContext('incorrect-ke'))).toThrow(UnauthorizedException)
  })

  it('accepts the configured API key', () => {
    config.get.mockReturnValue('expected-key')

    expect(guard.canActivate(makeContext('expected-key'))).toBe(true)
    expect(config.get).toHaveBeenCalledWith('DEVICE_API_KEY')
  })
})
