import { ApiError } from '../../../shared/api/client'
import { useQuery } from '@tanstack/react-query'
import { useAppSelector } from '../../../app/store/hooks'
import { getProfile, getWallet } from '../api/dashboardApi'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  profile: () => [...dashboardKeys.all, 'profile'] as const,
  wallet: () => [...dashboardKeys.all, 'wallet'] as const,
}

export function useDashboardData() {
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const profileQuery = useQuery({
    queryKey: dashboardKeys.profile(),
    queryFn: getProfile,
    enabled: Boolean(accessToken),
  })
  const walletQuery = useQuery({
    queryKey: dashboardKeys.wallet(),
    queryFn: getWallet,
    retry: (count, error) => !(error instanceof ApiError && [401, 404].includes(error.status ?? 0)) && count < 2,
    enabled: Boolean(accessToken),
  })

  return { profileQuery, walletQuery }
}
