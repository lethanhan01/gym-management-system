import { useCallback, useEffect, useState } from 'react'
import workoutService, { type WorkoutPlan } from '@/services/workout.service'
import { getApiError } from '@/lib/api-error'

export function useTrainerPlans() {
  const [data, setData] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await workoutService.getPlans())
    } catch (err) {
      setError(getApiError(err, 'Không thể tải kế hoạch tập.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}
