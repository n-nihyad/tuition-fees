import { useEffect, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import { Navigate, useLocation } from 'react-router'
import {
  getCurrentUser,
  UnauthorizedSessionError,
} from '../api/authApi'
import { clearAuthSession, getAccessToken } from '../store/authStore'

interface RequireAuthProps {
  allowedRole: string
  children: React.ReactNode
}

type AuthStatus = 'checking' | 'authorized' | 'unauthenticated' | 'unavailable'

export default function RequireAuth({
  allowedRole,
  children,
}: RequireAuthProps) {
  const location = useLocation()
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? 'checking' : 'unauthenticated',
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const accessToken = getAccessToken()

    if (!accessToken) {
      return () => {
        active = false
      }
    }

    getCurrentUser(accessToken)
      .then(({ role }) => {
        if (!active) return

        if (role !== allowedRole) {
          clearAuthSession()
          setStatus('unauthenticated')
          return
        }

        setStatus('authorized')
      })
      .catch((error: unknown) => {
        if (!active) return

        if (error instanceof UnauthorizedSessionError) {
          clearAuthSession()
          setStatus('unauthenticated')
          return
        }

        setStatus('unavailable')
      })

    return () => {
      active = false
    }
  }, [allowedRole, attempt])

  if (status === 'unauthenticated') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (status === 'unavailable') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Alert
          type="error"
          showIcon
          message="Không thể xác thực phiên đăng nhập"
          description="Hãy kiểm tra kết nối tới máy chủ rồi thử lại."
          action={
            <Button
              onClick={() => {
                setStatus('checking')
                setAttempt((value) => value + 1)
              }}
            >
              Thử lại
            </Button>
          }
        />
      </main>
    )
  }

  if (status === 'checking') {
    return (
      <main
        aria-label="Đang xác thực phiên đăng nhập"
        className="flex min-h-screen items-center justify-center"
      >
        <Spin size="large" />
      </main>
    )
  }

  return children
}
