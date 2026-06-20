import * as https from 'https'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ExerciseCategory } from '@prisma/client'
import { AuthenticatedUser } from '../../auth/types/jwt-payload.interface'
import { AuditService } from '../../common/audit/audit.service'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateExerciseDto } from './dto/create-exercise.dto'
import { UpdateExerciseDto } from './dto/update-exercise.dto'

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com'

const BODY_PART_CATEGORY_MAP: Record<string, string> = {
  cardio: 'cardio',
  back: 'strength',
  chest: 'strength',
  shoulders: 'strength',
  'upper arms': 'strength',
  'lower arms': 'strength',
  'upper legs': 'strength',
  'lower legs': 'strength',
  neck: 'strength',
  waist: 'strength',
}

function fetchExerciseDb(url: string, apiKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': RAPIDAPI_HOST } },
        (res) => {
          let raw = ''
          res.on('data', (chunk: string) => (raw += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw))
            } catch {
              reject(new Error(`ExerciseDB parse error: ${raw.slice(0, 200)}`))
            }
          })
        }
      )
      .on('error', reject)
  })
}

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService
  ) {}

  async findAll(filters: { category?: string; muscleGroup?: string }) {
    return this.prisma.exercise.findMany({
      where: {
        deletedAt: null,
        ...(filters.category && { category: filters.category as ExerciseCategory }),
        ...(filters.muscleGroup && {
          muscleGroup: { contains: filters.muscleGroup, mode: 'insensitive' },
        }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  async create(dto: CreateExerciseDto, user: AuthenticatedUser) {
    const exercise = await this.prisma.exercise.create({
      data: {
        name: dto.name,
        category: dto.category,
        muscleGroup: dto.muscleGroup ?? null,
        equipmentNeeded: dto.equipmentNeeded ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        createdByStaffId: user.staffId ?? null,
      },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.create',
      resourceType: 'exercise',
      resourceId: exercise.exerciseId.toString(),
      afterData: {
        exerciseId: exercise.exerciseId.toString(),
        name: exercise.name,
        category: exercise.category,
      },
    })

    return exercise
  }

  async update(id: bigint, dto: UpdateExerciseDto, user: AuthenticatedUser) {
    const before = await this.findOneOrThrow(id)
    const exercise = await this.prisma.exercise.update({ where: { exerciseId: id }, data: dto })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.update',
      resourceType: 'exercise',
      resourceId: id.toString(),
      beforeData: {
        exerciseId: before.exerciseId.toString(),
        name: before.name,
        category: before.category,
      },
      afterData: {
        exerciseId: exercise.exerciseId.toString(),
        name: exercise.name,
        category: exercise.category,
      },
    })

    return exercise
  }

  async softDelete(id: bigint, user: AuthenticatedUser) {
    await this.findOneOrThrow(id)
    const activeRef = await this.prisma.workoutPlanExercise.findFirst({
      where: {
        exerciseId: id,
        planDay: { plan: { assignments: { some: { status: 'active' } } } },
      },
    })
    if (activeRef) {
      throw new ConflictException('Exercise dang duoc dung trong plan active - khong the xoa')
    }

    const exercise = await this.prisma.exercise.update({
      where: { exerciseId: id },
      data: { deletedAt: new Date() },
    })

    await this.audit.log({
      actorUserId: user.userId,
      action: 'exercise.delete',
      resourceType: 'exercise',
      resourceId: id.toString(),
      afterData: { exerciseId: id.toString() },
    })

    return exercise
  }

  async findFromExerciseDb(filters: {
    category?: string
    name?: string
    limit?: number
    offset?: number
  }) {
    const apiKey = this.config.get<string>('EXERCISEDB_API_KEY')
    if (!apiKey) {
      this.logger.warn('EXERCISEDB_API_KEY not set — falling back to local exercises')
      return this.findAll({ category: filters.category })
    }

    const limit = filters.limit ?? 50
    const offset = filters.offset ?? 0
    const BASE = `https://${RAPIDAPI_HOST}`

    let url: string
    if (filters.name) {
      url = `${BASE}/exercises/name/${encodeURIComponent(filters.name)}?limit=${limit}&offset=${offset}`
    } else if (filters.category === 'cardio') {
      url = `${BASE}/exercises/bodyPart/cardio?limit=${limit}&offset=${offset}`
    } else {
      url = `${BASE}/exercises?limit=${limit}&offset=${offset}`
    }

    try {
      const data = (await fetchExerciseDb(url, apiKey)) as Array<{
        id: string
        name: string
        bodyPart: string
        target: string
        secondaryMuscles: string[]
        equipment: string
        gifUrl: string
        instructions: string[]
      }>

      if (!Array.isArray(data)) {
        const preview = JSON.stringify(data).slice(0, 200)
        const isRateLimit =
          typeof data === 'object' &&
          data !== null &&
          'message' in (data as object) &&
          String((data as Record<string, unknown>).message)
            .toLowerCase()
            .includes('too many')
        if (isRateLimit) {
          this.logger.warn('ExerciseDB rate limited — falling back to local', preview)
        } else {
          this.logger.error('ExerciseDB returned non-array — falling back to local', preview)
        }
        return this.findAll({ category: filters.category })
      }

      return data.map((item) => ({
        exerciseId: item.id,
        name: item.name,
        category: (BODY_PART_CATEGORY_MAP[item.bodyPart] ?? 'strength') as ExerciseCategory,
        muscleGroup:
          [item.target, ...(item.secondaryMuscles ?? [])].filter(Boolean).join(', ') || null,
        equipmentNeeded: item.equipment || 'Bodyweight',
        description: item.instructions?.slice(0, 3).join(' ') || null,
        imageUrl: item.gifUrl ?? null,
        createdByStaffId: null,
        createdAt: new Date(0),
        deletedAt: null,
      }))
    } catch (err) {
      this.logger.error('ExerciseDB fetch failed — falling back to local exercises', err)
      return this.findAll({ category: filters.category })
    }
  }

  async importFromExerciseDb(dto: {
    name: string
    category: string
    muscleGroup?: string | null
    equipmentNeeded?: string | null
    description?: string | null
    imageUrl?: string | null
  }) {
    const existing = await this.prisma.exercise.findFirst({
      where: { name: dto.name, deletedAt: null },
    })
    if (existing) return existing

    return this.prisma.exercise.create({
      data: {
        name: dto.name,
        category: dto.category as ExerciseCategory,
        muscleGroup: dto.muscleGroup ?? null,
        equipmentNeeded: dto.equipmentNeeded ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        createdByStaffId: null,
      },
    })
  }

  private async findOneOrThrow(id: bigint) {
    const ex = await this.prisma.exercise.findFirst({ where: { exerciseId: id, deletedAt: null } })
    if (!ex) throw new NotFoundException(`Exercise ${id} khong ton tai`)
    return ex
  }
}
