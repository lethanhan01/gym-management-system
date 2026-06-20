import { useCallback, useEffect, useState } from 'react'
import { memberService, type TrainerStudentSummary } from '@/services/member.service'
import { getApiError } from '@/lib/api-error'

export function useTrainerStudents({
  page,
  pageSize,
  search,
  status,
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: string
} = {}) {
  const [data, setData] = useState<TrainerStudentSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await memberService.list({ page, pageSize, search, status })
      setData(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(getApiError(err, 'Không thể tải danh sách học viên.'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, status])

  useEffect(() => {
    void load()
  }, [load])

  return { data, total, totalPages, loading, error, reload: load }
}
