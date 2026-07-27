import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ExerciseSource } from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'

type CatalogFilters = {
  q?: string
  bodyPartId?: number
  targetMuscleId?: number
  equipmentId?: number
  page?: number
  pageSize?: number
}

const EXERCISE_INCLUDE = {
  bodyPart: true,
  targetMuscle: true,
  equipment: true,
  secondaryMuscles: { include: { muscle: true } },
} as const

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async findAll(filters: CatalogFilters) {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24))
    const where = {
      deletedAt: null,
      catalogVisible: true,
      source: { in: [ExerciseSource.manual, ExerciseSource.exercisedb] },
      ...(filters.bodyPartId && { bodyPartId: filters.bodyPartId }),
      ...(filters.targetMuscleId && { targetMuscleId: filters.targetMuscleId }),
      ...(filters.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters.q && {
        name: { contains: filters.q, mode: 'insensitive' as const },
      }),
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.exercise.findMany({ where, include: EXERCISE_INCLUDE, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ name: 'asc' }, { exerciseId: 'asc' }] }),
      this.prisma.exercise.count({ where }),
    ])
    return { data: rows.map((row) => this.present(row)), meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  }

  async findBodyParts() {
    return this.prisma.exerciseBodyPart.findMany({ orderBy: { name: 'asc' } })
  }

  async findEquipments() {
    return this.prisma.exerciseEquipment.findMany({ orderBy: { name: 'asc' } })
  }

  async findMuscles() {
    return this.prisma.exerciseMuscle.findMany({ orderBy: { name: 'asc' } })
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.create({
      data: { 
        ...dto, 
        instructions: dto.instructions && dto.instructions.length ? JSON.stringify(dto.instructions) : null,
        source: ExerciseSource.manual, 
        catalogVisible: true, 
        createdByStaffId: user.staffId ?? null 
      },
      include: EXERCISE_INCLUDE,
    })
    await this.audit.log({ actorUserId: user.userId, action: 'exercise.create', resourceType: 'exercise', resourceId: exercise.exerciseId.toString(), afterData: { name: exercise.name, source: exercise.source } })
    return this.present(exercise)
  }

  async update(id: bigint, dto: UpdateExerciseDto, user: AuthenticatedUser) {
    const before = await this.findOneOrThrow(id)
    if (before.source === ExerciseSource.legacy) throw new ConflictException('Legacy exercise cannot be edited')
    if (before.source === ExerciseSource.exercisedb) {
      const invalid = Object.keys(dto).filter((key) => !['description', 'imageUrl'].includes(key))
      if (invalid.length) throw new BadRequestException('ExerciseDB exercises only allow description and image URL overrides')
      const exercise = await this.prisma.exercise.update({ where: { exerciseId: id }, data: { descriptionOverride: dto.description, imageUrlOverride: dto.imageUrl }, include: EXERCISE_INCLUDE })
      await this.audit.log({ actorUserId: user.userId, action: 'exercise.override', resourceType: 'exercise', resourceId: id.toString(), afterData: { fields: Object.keys(dto) } })
      return this.present(exercise)
    }
    const exercise = await this.prisma.exercise.update({ 
      where: { exerciseId: id }, 
      data: {
        ...dto,
        instructions: dto.instructions !== undefined ? (dto.instructions.length ? JSON.stringify(dto.instructions) : null) : undefined
      }, 
      include: EXERCISE_INCLUDE 
    })
    await this.audit.log({ actorUserId: user.userId, action: 'exercise.update', resourceType: 'exercise', resourceId: id.toString(), afterData: { name: exercise.name } })
    return this.present(exercise)
  }

  async clearOverrides(id: bigint, user: AuthenticatedUser) {
    const exercise = await this.findOneOrThrow(id)
    if (exercise.source !== ExerciseSource.exercisedb) throw new BadRequestException('Only ExerciseDB exercises have overrides')
    const updated = await this.prisma.exercise.update({ where: { exerciseId: id }, data: { descriptionOverride: null, imageUrlOverride: null }, include: EXERCISE_INCLUDE })
    await this.audit.log({ actorUserId: user.userId, action: 'exercise.clear_override', resourceType: 'exercise', resourceId: id.toString() })
    return this.present(updated)
  }

  async softDelete(id: bigint, user: AuthenticatedUser) {
    const exercise = await this.findOneOrThrow(id)
    if (exercise.source !== ExerciseSource.manual) throw new ConflictException('Only manual exercises can be deleted')
    const activeRef = await this.prisma.workoutPlanExercise.findFirst({ where: { exerciseId: id, planDay: { plan: { assignments: { some: { status: 'active' } } } } } })
    if (activeRef) throw new ConflictException('Exercise dang duoc dung trong plan active - khong the xoa')
    await this.prisma.exercise.update({ where: { exerciseId: id }, data: { deletedAt: new Date(), catalogVisible: false } })
    await this.audit.log({ actorUserId: user.userId, action: 'exercise.delete', resourceType: 'exercise', resourceId: id.toString() })
  }

  private async findOneOrThrow(id: bigint) {
    const ex = await this.prisma.exercise.findFirst({ where: { exerciseId: id, deletedAt: null } })
    if (!ex) throw new NotFoundException(`Exercise ${id} khong ton tai`)
    return ex
  }

  private present<T extends { description: string | null; imageUrl: string | null; descriptionOverride: string | null; imageUrlOverride: string | null; instructions: string | null }>(exercise: T) {
    let parsedInstructions: string[] | null = null;
    if (typeof exercise.instructions === 'string') {
      try {
        parsedInstructions = JSON.parse(exercise.instructions);
        if (!Array.isArray(parsedInstructions)) {
          parsedInstructions = [exercise.instructions];
        }
      } catch {
        parsedInstructions = [exercise.instructions];
      }
    } else if (Array.isArray(exercise.instructions)) {
      parsedInstructions = exercise.instructions;
    }

    return { 
      ...exercise, 
      description: exercise.descriptionOverride ?? exercise.description, 
      imageUrl: exercise.imageUrlOverride ?? exercise.imageUrl,
      instructions: parsedInstructions
    }
  }
}
