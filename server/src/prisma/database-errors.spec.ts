import { Prisma } from '@prisma/client'
import { databaseErrorCode, isTransientDatabaseError } from './database-errors'

describe('database error classification', () => {
  it.each(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])('classifies %s as transient', (code) => {
    const error = new Prisma.PrismaClientKnownRequestError('database failure', {
      code,
      clientVersion: 'test',
    })

    expect(databaseErrorCode(error)).toBe(code)
    expect(isTransientDatabaseError(error)).toBe(true)
  })

  it('classifies a TCP reset as transient without exposing its message', () => {
    expect(isTransientDatabaseError(new Error('read ECONNRESET from database'))).toBe(true)
  })
})
