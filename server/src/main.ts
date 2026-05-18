import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

/**
 * Cho phep JSON.stringify(BigInt) hoat dong (BigInt khong serialize mac dinh).
 * Prisma tra ve BigInt cho cot BIGSERIAL -> chuyen ra string trong response.
 */
;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString()
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  const config = app.get(ConfigService)

  app.use(helmet())
  app.enableCors({
    origin: config.get<string>('CLIENT_URL') ?? 'http://localhost:5173',
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.setGlobalPrefix('api/v1', { exclude: ['health'] })

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port} [${config.get('NODE_ENV')}]`)
}

void bootstrap()
