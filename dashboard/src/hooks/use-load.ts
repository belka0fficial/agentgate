import { useQuery } from '@tanstack/react-query'

import { api } from '../api'

export function useLoad<T>(path: string, enabled = true) {
  const query = useQuery({
    queryKey: [path],
    queryFn: () => api.get<T>(path),
    enabled,
  })

  return {
    data: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : '',
    loading: query.isLoading,
    reload: () => query.refetch(),
  }
}
