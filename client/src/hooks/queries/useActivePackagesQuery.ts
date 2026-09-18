import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import packageService, { type Package } from '@/services/package.service'
import { queryKeys } from '@/lib/query-keys'

export function useActivePackagesQuery(): UseQueryResult<Package[], Error> {
  return useQuery({
    queryKey: queryKeys.packages.active(),
    queryFn: async () => {
      const res = await packageService.list({ status: 'active' })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
