import { useQuery } from '@tanstack/react-query'
import { useAppSelector } from '../../../app/store/hooks'
import { getPaymentHistory } from '../api/historyApi'
import type { HistoryFilters } from '../../../shared/types/models'

export const historyKeys = {
  all: ['payment-history'] as const,
  list: (limit: number, offset: number, filters: HistoryFilters = {}) =>
    [...historyKeys.all, { limit, offset, ...filters }] as const,
}

export function usePaymentHistory(limit = 20, offset = 0, filters: HistoryFilters = {}) {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  return useQuery({
    queryKey: historyKeys.list(limit, offset, filters),
    queryFn: () => getPaymentHistory(limit, offset, filters),
    enabled: Boolean(accessToken),
  })
}
