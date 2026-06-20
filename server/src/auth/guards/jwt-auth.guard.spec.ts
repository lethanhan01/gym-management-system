import { ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { JwtAuthGuard } from './jwt-auth.guard'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

function createMockContext(handler = () => {}, cls = class {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as any
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard
  let reflector: { getAllAndOverride: jest.Mock }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    guard = new JwtAuthGuard(reflector as any)
  })

  it('returns true immediately when route is marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    const ctx = createMockContext()

    const result = guard.canActivate(ctx)

    expect(result).toBe(true)
  })

  it('passes IS_PUBLIC_KEY with handler and class to reflector', () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    const handler = () => {}
    const cls = class {}
    const ctx = createMockContext(handler, cls)

    guard.canActivate(ctx)

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, cls])
  })

  it('delegates to super.canActivate when isPublic is false', () => {
    reflector.getAllAndOverride.mockReturnValue(false)
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any)
    const ctx = createMockContext()

    guard.canActivate(ctx)

    expect(superSpy).toHaveBeenCalledWith(ctx)
    superSpy.mockRestore()
  })

  it('delegates to super.canActivate when @Public() decorator is absent (undefined)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true as any)
    const ctx = createMockContext()

    guard.canActivate(ctx)

    expect(superSpy).toHaveBeenCalledWith(ctx)
    superSpy.mockRestore()
  })

  it('does not call super.canActivate when route is public', () => {
    reflector.getAllAndOverride.mockReturnValue(true)
    const superSpy = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false as any)
    const ctx = createMockContext()

    const result = guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(superSpy).not.toHaveBeenCalled()
    superSpy.mockRestore()
  })
})
