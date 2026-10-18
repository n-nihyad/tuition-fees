import { http } from '../../../shared/api/client'
import type { LoginResult } from '../../../shared/types/models'

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data } = await http.post<LoginResult>('/api/auth/login', { username, password })
  return data
}

export async function logout(): Promise<void> {
  await http.post('/api/auth/logout')
}
