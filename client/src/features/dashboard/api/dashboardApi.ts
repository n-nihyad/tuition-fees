import { http } from '../../../shared/api/client'
import type { Profile, Wallet } from '../../../shared/types/models'

export async function getProfile(): Promise<Profile> {
  const { data } = await http.get<Profile>('/api/users/me')
  return data
}

export async function getWallet(): Promise<Wallet> {
  const { data } = await http.get<Wallet>('/api/wallet')
  return data
}
