import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react'
import { App as AntApp } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes } from 'react-router'
import { useAppDispatch, useAppSelector } from '../store/hooks'
const DashboardPage = lazy(() => import('../../features/dashboard/pages/DashboardPage'))
const LoginPage = lazy(() => import('../../features/auth/pages/LoginPage'))
const HistoryPage = lazy(() => import('../../features/history/pages/HistoryPage'))
const PaymentPage = lazy(() => import('../../features/payment/pages/PaymentPage'))
import { credentialsCleared } from '../../features/auth/store/authSlice'
import { paymentFlowReset } from '../../features/payment/store/paymentSlice'
import { SESSION_EXPIRED_EVENT, watchTokenExpiry } from '../../shared/auth/sessionExpiry'
import { useLocale } from '../../shared/providers/useLocale'
import LoadingState from '../../shared/components/feedback/LoadingState'
import ErrorState from '../../shared/components/feedback/ErrorState'

const ProtectedLayout = lazy(() => import('./ProtectedLayout'))

function RouteContent() {
  const token = useAppSelector((state) => state.auth.accessToken)
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const { t } = useLocale()

  useEffect(() => {
    function handleExpiredSession() {
      dispatch(credentialsCleared())
      dispatch(paymentFlowReset())
      queryClient.clear()
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession)
  }, [dispatch, queryClient])

  useEffect(() => {
    if (token) return watchTokenExpiry(token)
  }, [token])

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>
      <Route
        path="*"
        element={
          <ErrorState
            code="404"
            title={t('Trang này không tồn tại', 'This page doesn’t exist')}
            description={t('Đường dẫn có thể đã thay đổi hoặc không còn khả dụng.', 'The link may have changed or is no longer available.')}
            homePath={token ? '/dashboard' : '/login'}
            homeLabel={token ? t('Về tổng quan', 'Go to dashboard') : t('Về đăng nhập', 'Back to sign in')}
            fullScreen
          />
        }
      />
    </Routes>
  )
}

class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <ChunkLoadError /> : this.props.children
  }
}

function ChunkLoadError() {
  const { t } = useLocale()
  return <ErrorState title={t('Kh\u00f4ng th\u1ec3 m\u1edf trang', 'Could not open this page')}
    description={t('Ki\u1ec3m tra k\u1ebft n\u1ed1i r\u1ed3i t\u1ea3i l\u1ea1i trang.', 'Check your connection and reload the page.')}
    retryLabel={t('T\u1ea3i l\u1ea1i trang', 'Reload page')} onRetry={() => window.location.reload()} fullScreen />
}

export default function AppRoutes() {
  return <AntApp>
    <RouteBoundary>
      <Suspense fallback={<LoadingState fullScreen />}>
        <RouteContent />
      </Suspense>
    </RouteBoundary>
  </AntApp>
}
