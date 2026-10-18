import axios from 'axios'
import { getAccessToken } from '../auth/tokenStorage'
import { scheduleSessionExpiry } from '../auth/sessionExpiry'

export class ApiError extends Error {
  readonly status: number | undefined
  readonly otpAttemptsRemaining?: number

  constructor(message: string, status: number | undefined, cause: unknown, otpAttemptsRemaining?: number) {
    super(message, { cause })
    this.status = status
    this.otpAttemptsRemaining = otpAttemptsRemaining
    this.name = 'ApiError'
  }
}

export const http = axios.create({
  baseURL: '/',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const requestPath = error.config?.url?.split('?')[0] ?? ''
      const authorization = error.config?.headers?.get('Authorization')
      if (error.response?.status === 401 &&
          !/\/auth\/login\/?$/.test(requestPath) &&
          typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
        scheduleSessionExpiry(authorization.slice(7))
      }
      const payload: unknown = error.response?.data
      let message = error.message
      if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
        const detail = payload.detail
        message = Array.isArray(detail)
          ? detail.map((item: { loc?: (string | number)[]; msg?: string }) =>
            `${item.loc?.slice(1).join('.') ?? ''}: ${item.msg ?? 'Invalid value'}`).join('; ')
          : String(detail)
      }
      const remaining = error.response?.headers['x-otp-attempts-remaining']
      throw new ApiError(message, error.response?.status, error,
        remaining !== undefined && /^\d+$/.test(String(remaining)) ? Number(remaining) : undefined)
    }
    throw error
  },
)
