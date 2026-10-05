export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: string
}

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8000/api/v1/auth'

function isLoginResponse(value: unknown): value is LoginResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>
  return (
    typeof response.accessToken === 'string' &&
    typeof response.refreshToken === 'string' &&
    typeof response.expiresIn === 'number' &&
    typeof response.role === 'string'
  )
}

function getErrorMessage(value: unknown, status: number): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  ) {
    return value.message
  }

  if (status === 429) {
    return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.'
  }

  return `Đăng nhập thất bại (HTTP ${status}). Vui lòng thử lại.`
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${AUTH_API_URL.replace(/\/$/, '')}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status))
  }

  if (!isLoginResponse(payload)) {
    throw new Error('Phản hồi đăng nhập từ máy chủ không đúng định dạng.')
  }

  return payload
}
