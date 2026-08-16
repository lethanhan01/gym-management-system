import { HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { HttpExceptionFilter } from './http-exception.filter'

describe('HttpExceptionFilter', () => {
  it.each(['P2021', 'P2022', 'P2027'])(
    'reports Prisma %s as an out-of-date database schema',
    (code) => {
      const filter = new HttpExceptionFilter()
      const error = new Prisma.PrismaClientKnownRequestError('Database schema mismatch', {
        code,
        clientVersion: '6.19.3',
      })

      const result = (filter as any).mapException(error)

      expect(result).toEqual({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          success: false,
          code: 'DATABASE_SCHEMA_OUT_OF_DATE',
          message: 'Cau truc database chua dong bo voi phien ban API hien tai',
        },
      })
    }
  )
})
