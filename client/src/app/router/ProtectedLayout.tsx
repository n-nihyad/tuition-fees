import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useLogout } from '../../features/auth/hooks/useAuthActions'
import { paymentFlowReset } from '../../features/payment/store/paymentSlice'
import { dashboardKeys, useDashboardData } from '../../features/dashboard/hooks/useDashboardData'
import PortalLayout from '../../shared/components/layout/PortalLayout'
import { ApiError } from '../../shared/api/client'
import { errorMessage } from '../../shared/api/errorMessage'
import { useLocale } from '../../shared/providers/useLocale'
import LoadingState from '../../shared/components/feedback/LoadingState'
import ErrorState from '../../shared/components/feedback/ErrorState'

export default function ProtectedLayout() {
  const token = useAppSelector((state) => state.auth.accessToken)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const logout = useLogout()
  const queryClient = useQueryClient()
  const { profileQuery, walletQuery } = useDashboardData()
  const { locale } = useLocale()

  if (!token) return <Navigate to="/login" replace />

  function handleSignOut() {
    logout.mutate(undefined, {
      onSettled: () => {
        dispatch(paymentFlowReset())
        navigate('/login', { replace: true })
      },
    })
  }

  const walletMissing = walletQuery.error instanceof ApiError && walletQuery.error.status === 404
  const accountError = profileQuery.error ?? (walletMissing ? null : walletQuery.error)
  const profile = profileQuery.data
  const wallet = walletQuery.data

  if ((profileQuery.isPending || walletQuery.isPending) && !accountError) {
    return <LoadingState fullScreen />
  }

  return (
    <PortalLayout
      fullName={profile?.fullName}
      email={profile?.email}
      wallet={wallet ?? null}
      error={accountError ? errorMessage(accountError, locale) : ''}
      notice=""
      onSignOut={handleSignOut}
      onClearFeedback={() => {
        void queryClient.resetQueries({ queryKey: dashboardKeys.all })
      }}
    >
      {accountError && !profile && !wallet
        ? <ErrorState
            description={errorMessage(accountError, locale)}
            onRetry={() => {
              void queryClient.resetQueries({ queryKey: dashboardKeys.all })
            }}
          />
        : <Outlet />}
    </PortalLayout>
  )
}

