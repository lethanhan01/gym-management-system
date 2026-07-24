import { SetMetadata } from '@nestjs/common'

export const DATABASE_RETRYABLE_KEY = 'database-retryable'

/**
 * Marks an explicitly reviewed, side-effect-free GET/HEAD handler as safe to
 * execute one more time after a transient database connection failure.
 */
export const DatabaseRetryable = (): MethodDecorator =>
  SetMetadata(DATABASE_RETRYABLE_KEY, true)
