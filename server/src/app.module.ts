import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { validateConfig } from './config/configuration'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (raw) => validateConfig(raw),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
