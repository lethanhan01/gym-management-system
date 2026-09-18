import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { memberService, type TrainerSummary } from '@/services/member.service'
import { queryKeys } from '@/lib/query-keys'

export function useAvailableTrainersQuery(): UseQueryResult<TrainerSummary[], Error> {
  return useQuery({
    queryKey: queryKeys.trainers.available(),
    queryFn: () => memberService.getAvailableTrainers(),
    staleTime: 1000 * 60 * 5,
  })
}
