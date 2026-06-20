import api from './api'

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'balance'
export type WorkoutPlanStatus = 'draft' | 'active' | 'archived'
export type WorkoutAssignmentStatus = 'active' | 'completed' | 'replaced'
export type PlanCreatorType = 'staff' | 'member'

export interface Exercise {
  exerciseId: string
  name: string
  category: ExerciseCategory
  muscleGroup: string | null
  equipmentNeeded: string | null
  description: string | null
  imageUrl: string | null
  createdByStaffId: string | null
  createdAt: string
  deletedAt: string | null
}

export interface WorkoutPlanExercise {
  planExerciseId: string
  planDayId: string
  exerciseId: string
  orderIndex: number
  targetSets: number
  targetReps: number | null
  targetDurationSec: number | null
  targetWeightKg: string | null
  restSeconds: number | null
  notes: string | null
  exercise?: Exercise
}

export interface WorkoutPlanDay {
  planDayId: string
  planId: string
  dayNumber: number
  weekNumber: number
  dayOfWeek: number
  name: string
  notes: string | null
  exercises?: WorkoutPlanExercise[]
}

export interface WorkoutPlan {
  planId: string
  creatorStaffId: string | null
  creatorMemberId: string | null
  creatorType: PlanCreatorType
  name: string
  description: string | null
  status: WorkoutPlanStatus
  createdAt: string
  deletedAt: string | null
  days?: WorkoutPlanDay[]
  _count?: { assignments: number }
}

export interface PlanAssignment {
  assignmentId: string
  memberId: string
  memberName: string
  planId: string
  startDate: string
  status: WorkoutAssignmentStatus
  endedAt: string | null
  notes: string | null
  createdAt: string
}

export interface MemberWorkoutPlan {
  assignmentId: string
  memberId: string
  planId: string
  assignedByStaffId: string | null
  startDate: string
  status: WorkoutAssignmentStatus
  endedAt: string | null
  notes: string | null
  createdAt: string
  plan?: WorkoutPlan
}

export interface WorkoutAssignmentSummary extends Omit<MemberWorkoutPlan, 'plan'> {
  plan: {
    planId: string
    name: string
    description: string | null
    status: WorkoutPlanStatus
    days: Array<
      Pick<WorkoutPlanDay, 'planDayId' | 'weekNumber' | 'dayOfWeek' | 'dayNumber' | 'name'>
    >
  } | null
}

export interface WorkoutLogSet {
  logSetId: string
  logId: string
  planExerciseId: string
  setNumber: number
  actualReps: number | null
  actualWeightKg: string | null
  actualDurationSec: number | null
  completed: boolean
  planExercise?: WorkoutPlanExercise
}

export interface WorkoutLog {
  logId: string
  memberId: string
  assignmentId: string
  planDayId: string
  loggedAt: string
  durationMin: number | null
  notes: string | null
  planDay?: WorkoutPlanDay
  sets?: WorkoutLogSet[]
}

export interface CreateExerciseDto {
  name: string
  category: ExerciseCategory
  muscleGroup?: string
  equipmentNeeded?: string
  description?: string
  imageUrl?: string
}

export interface UpdateExerciseDto {
  name?: string
  category?: ExerciseCategory
  muscleGroup?: string
  equipmentNeeded?: string
  description?: string
  imageUrl?: string
}

export interface CreateWorkoutPlanDto {
  name: string
  description?: string
}

export interface UpdateWorkoutPlanDto {
  name?: string
  description?: string
  status?: WorkoutPlanStatus
}

export interface AddPlanDayDto {
  weekNumber?: number
  dayOfWeek?: number
  dayNumber: number
  name: string
  notes?: string
}

export interface AddPlanExerciseDto {
  exerciseId: number
  orderIndex: number
  targetSets: number
  targetReps?: number
  targetDurationSec?: number
  targetWeightKg?: number
  restSeconds?: number
  notes?: string
}

export type UpdatePlanExerciseDto = Partial<
  Pick<
    AddPlanExerciseDto,
    'targetSets' | 'targetReps' | 'targetDurationSec' | 'targetWeightKg' | 'restSeconds' | 'notes'
  >
>

export interface AssignPlanDto {
  planId: number
  startDate: string
  notes?: string
}

export interface LogSetDto {
  planExerciseId: number
  setNumber: number
  actualReps?: number
  actualWeightKg?: number
  actualDurationSec?: number
  completed?: boolean
}

export interface CreateWorkoutLogDto {
  assignmentId: number
  planDayId: number
  loggedAt: string
  durationMin?: number
  notes?: string
  sets: LogSetDto[]
}

const workoutService = {
  // Exercises
  async getExercises(params?: {
    category?: ExerciseCategory
    muscleGroup?: string
  }): Promise<Exercise[]> {
    const res = await api.get<{ success: boolean; data: Exercise[] }>('/exercises', { params })
    return res.data.data
  },

  async createExercise(dto: CreateExerciseDto): Promise<Exercise> {
    const res = await api.post<{ success: boolean; data: Exercise }>('/exercises', dto)
    return res.data.data
  },

  async updateExercise(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const res = await api.patch<{ success: boolean; data: Exercise }>(`/exercises/${id}`, dto)
    return res.data.data
  },

  async deleteExercise(id: string): Promise<void> {
    await api.delete(`/exercises/${id}`)
  },

  async getPlanAssignments(planId: string): Promise<PlanAssignment[]> {
    const res = await api.get<{ success: boolean; data: PlanAssignment[] }>(
      `/workout-plans/${planId}/assignments`
    )
    return res.data.data
  },

  async unassignMember(assignmentId: string): Promise<void> {
    await api.delete(`/workout-plans/assignments/${assignmentId}`)
  },


  // Workout Plans
  async getPlans(): Promise<WorkoutPlan[]> {
    const res = await api.get<{ success: boolean; data: WorkoutPlan[] }>('/workout-plans')
    return res.data.data
  },

  async getSuggestedPlans(): Promise<WorkoutPlan[]> {
    const res = await api.get<{ success: boolean; data: WorkoutPlan[] }>('/workout-plans/suggested')
    return res.data.data
  },

  async getPlan(id: string): Promise<WorkoutPlan> {
    const res = await api.get<{ success: boolean; data: WorkoutPlan }>(`/workout-plans/${id}`)
    return res.data.data
  },

  async createPlan(dto: CreateWorkoutPlanDto): Promise<WorkoutPlan> {
    const res = await api.post<{ success: boolean; data: WorkoutPlan }>('/workout-plans', dto)
    return res.data.data
  },

  async updatePlan(id: string, dto: UpdateWorkoutPlanDto): Promise<WorkoutPlan> {
    const res = await api.patch<{ success: boolean; data: WorkoutPlan }>(
      `/workout-plans/${id}`,
      dto
    )
    return res.data.data
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/workout-plans/${id}`)
  },

  async addPlanDay(planId: string, dto: AddPlanDayDto): Promise<WorkoutPlanDay> {
    const res = await api.post<{ success: boolean; data: WorkoutPlanDay }>(
      `/workout-plans/${planId}/days`,
      dto
    )
    return res.data.data
  },

  async updatePlanDay(
    planId: string,
    dayId: string,
    dto: Partial<AddPlanDayDto>
  ): Promise<WorkoutPlanDay> {
    const res = await api.patch<{ success: boolean; data: WorkoutPlanDay }>(
      `/workout-plans/${planId}/days/${dayId}`,
      dto
    )
    return res.data.data
  },

  async deletePlanDay(planId: string, dayId: string): Promise<void> {
    await api.delete(`/workout-plans/${planId}/days/${dayId}`)
  },

  async addPlanExercise(
    planId: string,
    dayId: string,
    dto: AddPlanExerciseDto
  ): Promise<WorkoutPlanExercise> {
    const res = await api.post<{ success: boolean; data: WorkoutPlanExercise }>(
      `/workout-plans/${planId}/days/${dayId}/exercises`,
      dto
    )
    return res.data.data
  },

  async deletePlanExercise(planId: string, dayId: string, peId: string): Promise<void> {
    await api.delete(`/workout-plans/${planId}/days/${dayId}/exercises/${peId}`)
  },

  async updatePlanExercise(
    planId: string,
    dayId: string,
    peId: string,
    dto: UpdatePlanExerciseDto
  ): Promise<WorkoutPlanExercise> {
    const res = await api.patch<{ success: boolean; data: WorkoutPlanExercise }>(
      `/workout-plans/${planId}/days/${dayId}/exercises/${peId}`,
      dto
    )
    return res.data.data
  },

  async assignPlan(memberId: string, dto: AssignPlanDto): Promise<MemberWorkoutPlan> {
    const res = await api.post<{ success: boolean; data: MemberWorkoutPlan }>(
      `/workout-plans/members/${memberId}/assign`,
      dto
    )
    return res.data.data
  },

  async getAssignments(
    memberId: string,
    params?: { status?: WorkoutAssignmentStatus; limit?: number }
  ): Promise<WorkoutAssignmentSummary[]> {
    const res = await api.get<{ success: boolean; data: WorkoutAssignmentSummary[] }>(
      `/workout-plans/members/${memberId}/assignments`,
      { params }
    )
    return res.data.data
  },

  // Workout Logs
  async getLogs(params?: {
    assignmentId?: string
    planDayId?: string
    limit?: number
    page?: number
    pageSize?: number
  }): Promise<WorkoutLog[]> {
    const res = await api.get<{ success: boolean; data: WorkoutLog[] }>('/workout-logs', { params })
    return res.data.data
  },

  async createLog(dto: CreateWorkoutLogDto): Promise<WorkoutLog> {
    const res = await api.post<{ success: boolean; data: WorkoutLog }>('/workout-logs', dto)
    return res.data.data
  },

  async updateLog(id: string, dto: { notes?: string; durationMin?: number }): Promise<WorkoutLog> {
    const res = await api.patch<{ success: boolean; data: WorkoutLog }>(`/workout-logs/${id}`, dto)
    return res.data.data
  },
}

export default workoutService
