import { useState } from 'react'
import { login } from '../api/authApi'
import type { LoginResponse } from '../api/authApi'
import { saveAuthSession } from '../store/authStore'

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false)

  async function submitLogin(
    username: string,
    password: string,
  ): Promise<LoginResponse> {
    setIsLoading(true)

    try {
      const session = await login({ username, password })
      saveAuthSession(session)
      return session
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    submitLogin,
  }
}
