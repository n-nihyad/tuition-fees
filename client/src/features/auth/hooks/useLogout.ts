import { logout as revokeSession } from '../api/authApi'
import { clearAuthSession, getAccessToken } from '../store/authStore'

export function useLogout() {
  async function submitLogout(): Promise<void> {
    const accessToken = getAccessToken()

    try {
      if (accessToken) {
        await revokeSession(accessToken)
      }
    } finally {
      clearAuthSession()
    }
  }

  return { submitLogout }
}
