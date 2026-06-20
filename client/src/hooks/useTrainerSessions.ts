import { useCallback, useEffect, useState } from 'react'
import { trainingService, type TrainingSession } from '@/services/training.service'
import { getApiError } from '@/lib/api-error'

export interface TrainerSessionFilters {
  memberId?: string
  roomId?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  sort?: string
}

export function useTrainerSessions({
  memberId,
  roomId,
  status,
  from,
  to,
  page,
  pageSize,
  sort,
}: TrainerSessionFilters = {}) {
  const [data, setData] = useState<TrainingSession[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await trainingService.getSessions({
        memberId,
        roomId,
        status,
        from,
        to,
        page,
        pageSize,
        sort,
      })
      setData(result.data)
      setTotal(result.total)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải lịch dạy.'))
    } finally {
      setLoading(false)
    }
  }, [memberId, roomId, status, from, to, page, pageSize, sort])

  useEffect(() => {
    void load()
  }, [load])

  return { data, total, loading, error, reload: load }
}
