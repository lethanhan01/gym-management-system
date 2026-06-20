import api from './api'

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
    category: 'strength' | 'cardio' | 'flexibility' | 'balance'
    muscleGroup: string | null
    equipmentNeeded: string | null
    description: string | null
    imageUrl: string | null
    createdByStaffId: string | null
    createdAt: string
    deletedAt: string | null
  } | null
}

export interface AttendanceLog {
  attendanceId: string
  memberId: string
  memberCode: string
  memberName: string
  subscriptionId: string
  sessionId: string | null
  startTime: string
  endTime: string | null
  method: 'realtime' | 'manual' | 'qr'
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

export interface MemberProgress {
  progressId: string
  memberId: string
  staffId: string | null
  staffName: string | null
  weight: number | null
  height: number | null
  bmi: number | null
  goal: string | null
  notes: string | null
  recordedAt: string
}

type MemberProgressResponse = Omit<MemberProgress, 'weight' | 'height' | 'bmi'> & {
  weight: number | string | null
  height: number | string | null
  bmi: number | string | null
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const trainingService = {
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

  getAttendance: async (params: {
    memberId?: string
    sessionId?: string
    method?: string
    from?: string
    to?: string
    month?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: AttendanceLog[]; total: number }> => {
    const { month, ...rest } = params
    const query: Record<string, unknown> = { ...rest }

    if (month) {
      const [yearStr, monthStr] = month.split('-')
      const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate()
      query.from = `${yearStr}-${monthStr}-01`
      query.to = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`
    }

    const res = await api.get<{
      success: boolean
      data: AttendanceLog[]
      meta?: { totalItems: number }
    }>('/attendance-logs', { params: query })
    return {
      data: res.data.data,
      total: res.data.meta?.totalItems ?? res.data.data.length,
    }
  },

  manualCheckin: async (data: {
    memberCode: string
    occurredAt: string
  }): Promise<AttendanceLog> => {
    const res = await api.post<{ success: boolean; data: AttendanceLog }>(
      '/attendance/manual-checkin',
      data
    )
    return res.data.data
  },

  checkout: async (attendanceId: string, endedAt: string): Promise<AttendanceLog> => {
    const res = await api.patch<{ success: boolean; data: AttendanceLog }>(
      `/attendance-logs/${attendanceId}/checkout`,
      { endedAt }
    )
    return res.data.data
  },

  listProgress: async (
    memberId: string,
    params?: { from?: string; to?: string; limit?: string }
  ): Promise<MemberProgress[]> => {
    const res = await api.get<{ success: boolean; data: MemberProgressResponse[] }>(
      `/members/${memberId}/progress`,
      { params }
    )
    return res.data.data.map((progress) => ({
      ...progress,
      weight: toNullableNumber(progress.weight),
      height: toNullableNumber(progress.height),
      bmi: toNullableNumber(progress.bmi),
    }))
  },
}
