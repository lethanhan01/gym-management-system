import api from './api'
import type { AttendanceLog } from './attendance.service'

export interface TrainingSession {
  sessionId: string
  memberId: string
  memberName: string
  trainerStaffId: string | null
  trainerName: string | null
  roomId: string | null
  roomName: string | null
  assignmentId: string | null
  planDayId: string | null
  workoutPlan: TrainingSessionWorkoutPlan | null
  planDay: TrainingSessionPlanDay | null
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

export interface TrainingSessionWorkoutPlan {
  planId: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
}

export interface TrainingSessionPlanDay {
  planDayId: string
  planId: string
  dayNumber: number
  weekNumber: number
  dayOfWeek: number
  name: string
  notes: string | null
  exercises?: TrainingSessionPlanExercise[]
}

export interface TrainingSessionPlanExercise {
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
  exercise: {
    exerciseId: string
    name: string
    bodyPart: { name: string } | null
    targetMuscle: { name: string } | null
    equipment: { name: string } | null
    description: string | null
    gifUrl: string | null
    createdByStaffId: string | null
    createdAt: string
    deletedAt: string | null
  } | null
}

export interface TrainingSessionDetail extends TrainingSession {
  attendanceLogs: AttendanceLog[]
}

export interface TrainingSessionPayload {
  memberId?: string
  trainerStaffId?: string
  roomId?: string
  assignmentId?: string
  planDayId?: string
  startTime?: string
  endTime?: string
}

export interface TrainerAvailabilitySlot {
  slotIndex: number
  startTime: string
  endTime: string
  available: boolean
  reason?: 'PAST_TIME' | 'TRAINER_BUSY' | 'MEMBER_BUSY'
}

export interface TrainerAvailabilityData {
  date: string
  trainer: {
    staffId: string
    fullName: string
    avatarFileId: string | null
  }
  slots: TrainerAvailabilitySlot[]
}

export interface CreateMemberBookingPayload {
  startTime: string
  endTime: string
  assignmentId?: string
  planDayId?: string
}

export const trainingSessionService = {
  getSessions: async (params: {
    memberId?: string
    trainerStaffId?: string
    roomId?: string
    status?: string
    from?: string
    to?: string
    sort?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: TrainingSession[]; total: number }> => {
    const res = await api.get<{
      success: boolean
      data: TrainingSession[]
      meta?: { totalItems: number }
    }>('/training-sessions', { params })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },

  getSession: async (id: string): Promise<TrainingSessionDetail> => {
    const res = await api.get<{ success: boolean; data: TrainingSessionDetail }>(
      `/training-sessions/${id}`
    )
    return res.data.data
  },

  createSession: async (
    data: Required<Pick<TrainingSessionPayload, 'memberId' | 'roomId' | 'startTime' | 'endTime'>> &
      Pick<TrainingSessionPayload, 'assignmentId' | 'planDayId'>
  ): Promise<TrainingSession> => {
    const res = await api.post<{ success: boolean; data: TrainingSession }>(
      '/training-sessions',
      data
    )
    return res.data.data
  },

  updateSession: async (
    id: string,
    data: Omit<TrainingSessionPayload, 'memberId'>
  ): Promise<TrainingSession> => {
    const res = await api.patch<{ success: boolean; data: TrainingSession }>(
      `/training-sessions/${id}`,
      data
    )
    return res.data.data
  },

  cancelSession: async (id: string, reason?: string): Promise<void> => {
    await api.post(`/training-sessions/${id}/cancel`, { reason })
  },

  updateSessionStatus: async (
    id: string,
    status: 'in_progress' | 'completed'
  ): Promise<TrainingSession> => {
    const res = await api.post<{ success: boolean; data: TrainingSession }>(
      `/training-sessions/${id}/status`,
      { status }
    )
    return res.data.data
  },

  getTrainerAvailability: async (date: string): Promise<TrainerAvailabilityData> => {
    const res = await api.get<
      TrainerAvailabilityData & { success: boolean; data?: TrainerAvailabilityData }
    >('/training-sessions/trainer-availability', { params: { date } })
    return (res.data?.data ?? res.data) as TrainerAvailabilityData
  },

  getTrainerAvailabilityForTrainer: async (
    date: string,
    trainerStaffId: string,
    memberId?: string,
  ): Promise<TrainerAvailabilityData> => {
    const params = new URLSearchParams({ date })
    if (trainerStaffId) params.set('trainerStaffId', trainerStaffId)
    if (memberId) params.set('memberId', memberId)
    const res = await api.get<TrainerAvailabilityData>(
      `/training-sessions/trainer-availability-for-trainer?${params.toString()}`
    )
    return res.data
  },

  bookSession: async (payload: CreateMemberBookingPayload): Promise<TrainingSession> => {
    const res = await api.post<{ success: boolean; data: TrainingSession }>(
      '/training-sessions/book',
      payload
    )
    return res.data.data
  },

  cancelBooking: async (
    sessionId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string }>(
      `/training-sessions/${sessionId}/cancel-booking`,
      { reason }
    )
    return res.data
  },
}
