import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { OtpStoreModule } from './common/otp-store/otp-store.module'
import { AuthModule } from './auth/auth.module'
import { validateConfig } from './config/configuration'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma/prisma.module'
import { RbacModule } from './rbac/rbac.module'
import { MembershipModule } from './membership/membership.module'
import { MembersModule } from './members/members.module'
import { PaymentsModule } from './payments/payments.module'
import { TrainingModule } from './training/training.module'
import { FeedbackModule } from './feedback/feedback.module'
import { WorkoutModule } from './workout/workout.module'
import { StaffModule } from './staff/staff.module'
import { FacilityModule } from './facility/facility.module'
import { ReportsModule } from './reports/reports.module'
import { PermissionCacheModule } from './common/cache/permission-cache.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (raw) => validateConfig(raw),
    }),
    PermissionCacheModule,
    OtpStoreModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    RbacModule,
    MembershipModule,
    MembersModule,
    PaymentsModule,
    TrainingModule,
    FeedbackModule,
    WorkoutModule,
    StaffModule,
    FacilityModule,
    ReportsModule,
  ],
})
export class AppModule {}
