import { http } from '../../../shared/api/client'
import type { HistoryFilters, PaymentHistory } from '../../../shared/types/models'

export async function getPaymentHistory(
  limit = 20,
  offset = 0,
  filters: HistoryFilters = {},
): Promise<PaymentHistory> {
  const { data } = await http.get<PaymentHistory>('/api/payments', {
    params: { limit, offset, ...filters },
  })
  return data
}
