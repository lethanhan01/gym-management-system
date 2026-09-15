import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { TrainingSessionStatus, WorkoutAssignmentStatus } from '@prisma/client'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CancelBookingDto, CreateMemberBookingDto, TrainerAvailabilityQueryDto } from './dto'
import { TrainerSessionAvailabilityService } from './trainer-session-availability.service'
import { TrainingCallerResolverService } from './training-caller-resolver.service'
import { TrainingSessionNotificationService } from './training-session-notification.service'
import { SESSION_SUMMARY_INCLUDE, TrainingSessionPresenter } from './training-session.presenter'
import { TrainingSessionSchedulingService } from './training-session-scheduling.service'
import { TrainingCaller as Caller } from './training.types'

@Injectable()
export class MemberSessionBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly caller: TrainingCallerResolverService,
    private readonly scheduling: TrainingSessionSchedulingService,
    private readonly presenter: TrainingSessionPresenter,
    private readonly sessionNotifications: TrainingSessionNotificationService,
    private readonly availability: TrainerSessionAvailabilityService
  ) {}

  async getTrainerAvailability(query: TrainerAvailabilityQueryDto, caller: Caller) {
    const memberId = await this.caller.resolveMemberId(caller)
    if (!memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }

    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: { primaryTrainerId: true },
    })

    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Member khong ton tai',
      })
    }

    if (!member.primaryTrainerId) {
      throw new BadRequestException({
        success: false,
        code: 'NO_PRIMARY_TRAINER',
        message: 'Ban chua duoc gan PT phu trach',
      })
    }

    return this.availability.getAvailabilitySlots(
      query.date,
      member.primaryTrainerId,
      memberId,
    )
  }

  async getActivePlanForBooking(caller: Caller) {
    const memberId = await this.caller.resolveMemberId(caller)
    if (!memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }

    const member = await this.prisma.member.findFirst({
      where: { memberId, deletedAt: null },
      select: {
        memberId: true,
        primaryTrainerId: true,
        primaryTrainer: {
          select: {
            staffId: true,
            user: { select: { fullName: true } },
          },
        },
      },
    })

    if (!member) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Member khong ton tai',
      })
    }

    if (!member.primaryTrainerId || !member.primaryTrainer) {
      throw new BadRequestException({
        success: false,
        code: 'NO_PRIMARY_TRAINER',
        message: 'Ban chua duoc gan PT phu trach',
      })
    }

    const now = new Date()
    const todayDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        memberId,
        status: 'active',
        deletedAt: null,
        endDate: { gte: todayDate },
      },
      include: { package: true },
    })

    const trainerInfo = {
      staffId: member.primaryTrainer.staffId.toString(),
      fullName: member.primaryTrainer.user.fullName,
    }

    if (!activeSub) {
      return {
        hasPtBenefit: false,
        subscriptionReason: 'NO_ACTIVE_SUBSCRIPTION',
        hasActivePlan: false,
        trainer: trainerInfo,
        days: [],
        allCompletedOrScheduled: false,
      }
    }

    if (!activeSub.package.includesPt) {
      return {
        hasPtBenefit: false,
        subscriptionReason: 'SUBSCRIPTION_WITHOUT_PT',
        packageName: activeSub.package.name,
        hasActivePlan: false,
        trainer: trainerInfo,
        days: [],
        allCompletedOrScheduled: false,
      }
    }

    const assignment = await this.prisma.memberWorkoutPlan.findFirst({
      where: {
        memberId,
        status: WorkoutAssignmentStatus.active,
        assignedByStaffId: member.primaryTrainerId,
      },
      include: {
        plan: {
          include: {
            days: {
              where: { deletedAt: null },
              include: {
                exercises: { where: { deletedAt: null }, select: { planExerciseId: true } },
              },
              orderBy: { dayNumber: 'asc' },
            },
          },
        },
      },
    })

    if (!assignment || !assignment.plan) {
      return {
        hasPtBenefit: true,
        hasActivePlan: false,
        reason: 'NO_PT_ASSIGNED_PLAN',
        trainer: trainerInfo,
        days: [],
        allCompletedOrScheduled: false,
      }
    }

    const [logs, sessions] = await Promise.all([
      this.prisma.workoutLog.findMany({
        where: { memberId, assignmentId: assignment.assignmentId },
        select: { planDayId: true },
      }),
      this.prisma.trainingSession.findMany({
        where: {
          memberId,
          assignmentId: assignment.assignmentId,
          deletedAt: null,
          status: { in: [TrainingSessionStatus.scheduled, TrainingSessionStatus.in_progress, TrainingSessionStatus.completed] },
        },
        select: { planDayId: true, status: true },
      }),
    ])

    const loggedDayIds = new Set(logs.map((l) => l.planDayId.toString()))
    const completedSessionDayIds = new Set(
      sessions
        .filter((s) => s.status === TrainingSessionStatus.completed && s.planDayId)
        .map((s) => s.planDayId!.toString())
    )
    const scheduledSessionDayIds = new Set(
      sessions
        .filter(
          (s) =>
            (s.status === TrainingSessionStatus.scheduled || s.status === TrainingSessionStatus.in_progress) &&
            s.planDayId
        )
        .map((s) => s.planDayId!.toString())
    )

    const days = assignment.plan.days.map((d) => {
      const dayIdStr = d.planDayId.toString()
      let status: 'completed' | 'scheduled' | 'available' = 'available'
      if (completedSessionDayIds.has(dayIdStr) || loggedDayIds.has(dayIdStr)) {
        status = 'completed'
      } else if (scheduledSessionDayIds.has(dayIdStr)) {
        status = 'scheduled'
      }

      return {
        planDayId: dayIdStr,
        dayNumber: d.dayNumber,
        weekNumber: d.weekNumber,
        dayOfWeek: d.dayOfWeek,
        name: d.name,
        exerciseCount: d.exercises.length,
        status,
      }
    })

    const allCompletedOrScheduled = days.length > 0 && days.every((d) => d.status !== 'available')

    return {
      hasPtBenefit: true,
      hasActivePlan: true,
      assignmentId: assignment.assignmentId.toString(),
      planId: assignment.plan.planId.toString(),
      planName: assignment.plan.name,
      trainer: trainerInfo,
      days,
      allCompletedOrScheduled,
    }
  }

  async bookSessionByMember(dto: CreateMemberBookingDto, caller: Caller) {
    const memberId = await this.caller.resolveMemberId(caller)
    if (!memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }

    const startTime = new Date(dto.startTime)
    const endTime = new Date(dto.endTime)
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || endTime <= startTime) {
      throw new BadRequestException({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'endTime phai lon hon startTime',
      })
    }

    const durationMs = endTime.getTime() - startTime.getTime()
    if (durationMs !== 60 * 60 * 1000) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_DURATION',
        message: 'Thoi luong buoi tap phai dung 60 phut',
      })
    }

    const now = new Date()
    const minBookingTime = new Date(now.getTime() + 5 * 60 * 1000)
    const maxBookingTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (startTime < minBookingTime || startTime > maxBookingTime) {
      throw new BadRequestException({
        success: false,
        code: 'INVALID_BOOKING_TIME',
        message: 'Chi duoc dat lich truoc toi da 7 ngay va it nhat 5 phut truoc gio tap',
      })
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({
        where: { memberId, deletedAt: null },
        select: {
          memberId: true,
          primaryTrainerId: true,
          primaryTrainer: { select: { staffId: true, deletedAt: true } },
        },
      })

      if (
        !member ||
        !member.primaryTrainerId ||
        !member.primaryTrainer ||
        member.primaryTrainer.deletedAt
      ) {
        throw new BadRequestException({
          success: false,
          code: 'NO_PRIMARY_TRAINER',
          message: 'Ban chua duoc gan PT phu trach hoac PT khong ton tai',
        })
      }

      const scheduledCount = await tx.trainingSession.count({
        where: {
          memberId,
          status: TrainingSessionStatus.scheduled,
          deletedAt: null,
          startTime: { gte: now },
        },
      })
      if (scheduledCount >= 3) {
        throw new BadRequestException({
          success: false,
          code: 'BOOKING_LIMIT_EXCEEDED',
          message: 'Ban chi duoc phep co toi da 3 lich tap dang cho dien ra',
        })
      }

      const sessionDate = new Date(
        Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate())
      )
      const activeSub = await tx.subscription.findFirst({
        where: {
          memberId,
          status: 'active',
          deletedAt: null,
          startDate: { lte: sessionDate },
          endDate: { gte: sessionDate },
        },
        include: { package: true },
      })
      if (!activeSub) {
        throw new ConflictException({
          success: false,
          code: 'MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION',
          message: 'Member khong co subscription active tai ngay session',
        })
      }

      if (!activeSub.package.includesPt) {
        throw new ForbiddenException({
          success: false,
          code: 'SUBSCRIPTION_DOES_NOT_INCLUDE_PT',
          message: 'Goi tap hien tai cua ban khong bao gom quyen loi HLV ca nhan (PT)',
        })
      }

      await this.scheduling.checkOverlap(
        null,
        member.primaryTrainerId,
        startTime,
        endTime,
        'TRAINER_TIME_OVERLAP',
        undefined,
        undefined,
        tx
      )

      await this.scheduling.checkOverlap(
        null,
        null,
        startTime,
        endTime,
        'MEMBER_TIME_OVERLAP',
        undefined,
        memberId,
        tx
      )

      const availableRoom = await this.scheduling.findAvailableRoom(startTime, endTime, tx)
      if (!availableRoom) {
        throw new ConflictException({
          success: false,
          code: 'NO_ROOM_AVAILABLE',
          message: 'Khong con phong tap nao trong trong khung gio nay',
        })
      }

      const planLink = await this.scheduling.resolveSessionPlanLink(
        dto.assignmentId,
        dto.planDayId,
        memberId,
        true,
        tx
      )

      if (!planLink) {
        throw new BadRequestException({
          success: false,
          code: 'WORKOUT_PLAN_REQUIRED',
          message: 'Bat buoc phai chon ngay tap trong giao an',
        })
      }

      const assignmentCheck = await tx.memberWorkoutPlan.findFirst({
        where: {
          assignmentId: planLink.assignmentId,
          memberId,
          status: WorkoutAssignmentStatus.active,
          assignedByStaffId: member.primaryTrainerId,
        },
        select: { assignmentId: true },
      })
      if (!assignmentCheck) {
        throw new BadRequestException({
          success: false,
          code: 'WORKOUT_ASSIGNMENT_INVALID',
          message: 'Giao an phai do dung HLV phu trach hien tai cua ban phan cong',
        })
      }

      const [existingLog, existingCompletedSession] = await Promise.all([
        tx.workoutLog.findFirst({
          where: {
            memberId,
            assignmentId: planLink.assignmentId,
            planDayId: planLink.planDayId,
          },
          select: { logId: true },
        }),
        tx.trainingSession.findFirst({
          where: {
            memberId,
            assignmentId: planLink.assignmentId,
            planDayId: planLink.planDayId,
            status: TrainingSessionStatus.completed,
            deletedAt: null,
          },
          select: { sessionId: true },
        }),
      ])
      if (existingLog || existingCompletedSession) {
        throw new ConflictException({
          success: false,
          code: 'WORKOUT_PLAN_DAY_ALREADY_COMPLETED',
          message: 'Ngay tap nay da hoan thanh truoc do, vui long chon ngay khac',
        })
      }

      const existingScheduledSession = await tx.trainingSession.findFirst({
        where: {
          memberId,
          assignmentId: planLink.assignmentId,
          planDayId: planLink.planDayId,
          status: { in: [TrainingSessionStatus.scheduled, TrainingSessionStatus.in_progress] },
          deletedAt: null,
        },
        select: { sessionId: true },
      })
      if (existingScheduledSession) {
        throw new ConflictException({
          success: false,
          code: 'WORKOUT_PLAN_DAY_ALREADY_SCHEDULED',
          message: 'Ngay tap nay dang co mot lich hen cho dien ra, vui long chon ngay khac',
        })
      }

      const created = await tx.trainingSession.create({
        data: {
          memberId,
          trainerStaffId: member.primaryTrainerId,
          roomId: availableRoom.roomId,
          assignmentId: planLink.assignmentId,
          planDayId: planLink.planDayId,
          startTime,
          endTime,
          status: TrainingSessionStatus.scheduled,
        },
        include: SESSION_SUMMARY_INCLUDE,
      })


      return created
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.member_book',
      resourceType: 'training_session',
      resourceId: session.sessionId.toString(),
      afterData: this.presenter.serializeSession(session) as unknown as Record<string, unknown>,
    })

    await this.sessionNotifications.notifyCreated(session, caller.userId)

    return { data: this.presenter.serializeSession(session) }
  }

  async cancelBookingByMember(id: bigint, dto: CancelBookingDto, caller: Caller) {
    const memberId = await this.caller.resolveMemberId(caller)
    if (!memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong tim thay member profile',
      })
    }

    const session = await this.prisma.trainingSession.findFirst({
      where: { sessionId: id, deletedAt: null },
      include: SESSION_SUMMARY_INCLUDE,
    })
    if (!session) {
      throw new NotFoundException({
        success: false,
        code: 'NOT_FOUND',
        message: 'Session khong ton tai',
      })
    }

    if (session.memberId !== memberId) {
      throw new ForbiddenException({
        success: false,
        code: 'FORBIDDEN',
        message: 'Khong co quyen huy session cua nguoi khac',
      })
    }

    if (session.status !== TrainingSessionStatus.scheduled) {
      throw new ConflictException({
        success: false,
        code: 'SESSION_NOT_CANCELLABLE',
        message: 'Chi co the huy buoi tap dang o trang thai scheduled',
      })
    }

    const now = Date.now()
    if (session.startTime.getTime() - now < 2 * 60 * 60 * 1000) {
      throw new BadRequestException({
        success: false,
        code: 'LATE_CANCELLATION',
        message:
          'Chi duoc phep huy truoc gio tap toi thieu 2 tieng. Vui long lien he truc tiep voi PT de duoc ho tro.',
      })
    }

    const cancelled = await this.prisma.trainingSession.update({
      where: { sessionId: id },
      data: { status: TrainingSessionStatus.cancelled },
      include: SESSION_SUMMARY_INCLUDE,
    })

    await this.audit.log({
      actorUserId: caller.userId,
      action: 'training.member_cancel',
      resourceType: 'training_session',
      resourceId: id.toString(),
      beforeData: this.presenter.serializeSession(session) as unknown as Record<string, unknown>,
      afterData: {
        ...this.presenter.serializeSession(cancelled),
        reason: dto.reason,
        cancelledBy: caller.userId.toString(),
      } as unknown as Record<string, unknown>,
    })

    await this.sessionNotifications.notifyCancelled(cancelled, caller.userId)

    return {
      success: true,
      message: 'Da huy lich tap thanh cong',
    }
  }
}
