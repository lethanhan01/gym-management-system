import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { Observable, defer, from, mergeMap, timer, catchError } from 'rxjs'
import { DATABASE_RETRYABLE_KEY } from '../decorators/database-retryable.decorator'
import { isConnectionPoolTimeout, isTransientDatabaseError } from '../../prisma/database-errors'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DatabaseRetryInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    const isMarkedRetryable = this.reflector.getAllAndOverride<boolean>(DATABASE_RETRYABLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const isSafeMethod = request.method === 'GET' || request.method === 'HEAD'

    if (!isSafeMethod || !isMarkedRetryable) return next.handle()

    const execute = () => defer(() => next.handle())
    return execute().pipe(
      catchError((error: unknown) => {
        if (!isTransientDatabaseError(error)) throw error

        // Pool exhaustion is load/backpressure, not a broken socket. Disconnecting
        // the singleton Prisma client here would abort unrelated in-flight queries.
        if (isConnectionPoolTimeout(error)) throw error

        const jitterMs = 100 + Math.floor(Math.random() * 151)
        const startedAt = Date.now()
        return from(this.prisma.recoverConnection()).pipe(
          mergeMap((recovered) => {
            if (!recovered) throw error
            this.prisma.logRetry(
              request.method,
              request.route?.path ?? request.path,
              1,
              Date.now() - startedAt
            )
            return timer(jitterMs)
          }),
          mergeMap(() => execute())
        )
      })
    )
  }
}
