import api from './api'

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

export const memberProgressService = {
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
