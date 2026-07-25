import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Prisma } from '@prisma/client'
import { lastValueFrom, of, throwError } from 'rxjs'
import { PrismaService } from '../../prisma/prisma.service'
import { DatabaseRetryInterceptor } from './database-retry.interceptor'

describe('DatabaseRetryInterceptor', () => {
  const transientError = () =>
    new Prisma.PrismaClientKnownRequestError('connection reset', {
      code: 'P1017',
      clientVersion: 'test',
    })

  function context(method = 'GET'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, path: '/payments', route: { path: '/payments' } }),
      }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext
  }

  it('reconnects and retries a marked GET exactly once', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector
    const prisma = {
      recoverConnection: jest.fn().mockResolvedValue(true),
      logRetry: jest.fn(),
    } as unknown as PrismaService
    const handler = {
      handle: jest.fn().mockReturnValueOnce(throwError(() => transientError())).mockReturnValueOnce(of('ok')),
    } as unknown as CallHandler

    const interceptor = new DatabaseRetryInterceptor(reflector, prisma)
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).resolves.toBe('ok')
    expect(handler.handle).toHaveBeenCalledTimes(2)
    expect(prisma.recoverConnection).toHaveBeenCalledTimes(1)
  })

  it('does not retry an unmarked GET', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector
    const prisma = { recoverConnection: jest.fn(), logRetry: jest.fn() } as unknown as PrismaService
    const handler = { handle: jest.fn().mockReturnValue(throwError(() => transientError())) } as unknown as CallHandler

    const interceptor = new DatabaseRetryInterceptor(reflector, prisma)
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toThrow('connection reset')
    expect(prisma.recoverConnection).not.toHaveBeenCalled()
  })

  it('does not retry a marked POST', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector
    const prisma = { recoverConnection: jest.fn(), logRetry: jest.fn() } as unknown as PrismaService
    const handler = { handle: jest.fn().mockReturnValue(throwError(() => transientError())) } as unknown as CallHandler

    const interceptor = new DatabaseRetryInterceptor(reflector, prisma)
    await expect(lastValueFrom(interceptor.intercept(context('POST'), handler))).rejects.toThrow('connection reset')
    expect(prisma.recoverConnection).not.toHaveBeenCalled()
    expect(handler.handle).toHaveBeenCalledTimes(1)
  })

  it('does not disconnect or retry when the Prisma connection pool is full', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector
    const prisma = { recoverConnection: jest.fn(), logRetry: jest.fn() } as unknown as PrismaService
    const poolTimeout = new Prisma.PrismaClientKnownRequestError(
      'Timed out fetching a new connection from the connection pool',
      { code: 'P2024', clientVersion: 'test' },
    )
    const handler = { handle: jest.fn().mockReturnValue(throwError(() => poolTimeout)) } as unknown as CallHandler

    const interceptor = new DatabaseRetryInterceptor(reflector, prisma)
    await expect(lastValueFrom(interceptor.intercept(context(), handler))).rejects.toThrow('connection pool')
    expect(prisma.recoverConnection).not.toHaveBeenCalled()
    expect(handler.handle).toHaveBeenCalledTimes(1)
  })
})
