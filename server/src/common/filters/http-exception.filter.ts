import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Request, Response } from 'express'

interface ErrorBody {
  success: false
  code: string
  message: string
  details?: unknown
}

/**
 * Global filter dam bao moi response loi tuan thu cau truc:
 *   { success: false, code, message, details? }
 *
 * - HttpException (NestJS): giu nguyen status code, lay code tu name cua exception.
 * - PrismaClientKnownRequestError: map sang HTTP code phu hop (P2002, P2025, ...).
 * - Cac error khac: ghi log + tra ve 500 generic.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const { status, body } = this.mapException(exception)

    if (status >= 500) {
      this.logger.error(
        `[${request.method} ${request.url}] ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    } else {
      this.logger.warn(
        `[${request.method} ${request.url}] ${status} ${body.code}: ${body.message}`,
      )
    }

    response.status(status).json(body)
  }

  private mapException(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        return {
          status,
          body: { success: false, code: this.deriveCode(exception), message: res },
        }
      }

      const obj = res as { message?: string | string[]; error?: string; code?: string }
      const message = Array.isArray(obj.message) ? obj.message.join('; ') : obj.message ?? exception.message
      return {
        status,
        body: {
          success: false,
          code: obj.code ?? this.deriveCode(exception),
          message,
          details: Array.isArray(obj.message) ? obj.message : undefined,
        },
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaError(exception)
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'Du lieu truyen vao khong hop le',
        },
      }
    }

    const fallbackMessage =
      exception instanceof Error ? exception.message : 'Da co loi xay ra, vui long thu lai sau'

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: fallbackMessage,
      },
    }
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
    status: number
    body: ErrorBody
  } {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[] | string | undefined) ?? 'field'
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            code: 'DUPLICATE_VALUE',
            message: `Gia tri da ton tai: ${Array.isArray(target) ? target.join(', ') : target}`,
            details: err.meta,
          },
        }
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            success: false,
            code: 'NOT_FOUND',
            message: 'Khong tim thay ban ghi yeu cau',
            details: err.meta,
          },
        }
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          body: {
            success: false,
            code: 'FK_CONSTRAINT',
            message: 'Vi pham rang buoc khoa ngoai',
            details: err.meta,
          },
        }
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            success: false,
            code: `PRISMA_${err.code}`,
            message: err.message.split('\n').pop() ?? 'Loi database',
          },
        }
    }
  }

  private deriveCode(exception: HttpException): string {
    const name = exception.constructor.name
      .replace(/Exception$/, '')
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
      .toUpperCase()
    return name || 'ERROR'
  }
}
