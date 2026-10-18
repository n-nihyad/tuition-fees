import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '../../../app/store/hooks'
import { dashboardKeys } from '../../dashboard/hooks/useDashboardData'
import { historyKeys } from '../../history/hooks/usePaymentHistory'
import { confirmPayment, lookupFee, startPayment } from '../api/paymentApi'
import { feeLookedUp, paymentReceived } from '../store/paymentSlice'
import { getAccessToken } from '../../../shared/auth/tokenStorage'

async function withinCurrentSession<T>(request: () => Promise<T>): Promise<T> {
  const token = getAccessToken()
  const result = await request()
  if (!token || getAccessToken() !== token) throw new Error('Session changed while the request was in progress.')
  return result
}

export function useLookupFee() {
  const dispatch = useAppDispatch()
  return useMutation({ mutationFn: (id: string) => withinCurrentSession(() => lookupFee(id)), onSuccess: (fee) => dispatch(feeLookedUp(fee)) })
}

export function useStartPayment() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['payment', 'start'],
    mutationFn: (body: Parameters<typeof startPayment>[0]) => withinCurrentSession(() => startPayment(body)),
    onSuccess: (payment) => {
      dispatch(paymentReceived(payment))
      void queryClient.invalidateQueries({ queryKey: historyKeys.all })
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.wallet() })
    },
  })
}

export function useConfirmPayment() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['payment', 'confirm'],
    mutationFn: ({ paymentId, otp }: { paymentId: string; otp: string }) => withinCurrentSession(() => confirmPayment(paymentId, otp)),
    onSuccess: (payment) => { dispatch(paymentReceived(payment)) },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: historyKeys.all }),
      ])
    },
  })
}
