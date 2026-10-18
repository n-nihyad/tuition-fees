import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '../../../app/store/hooks'
import {
  clearAccessToken,
  storeAccessToken,
} from '../../../shared/auth/tokenStorage'
import { credentialsCleared, credentialsStored } from '../store/authSlice'
import { login, logout } from '../api/authApi'

export function useLogin() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (result) => {
      queryClient.clear()
      storeAccessToken(result.accessToken)
      dispatch(credentialsStored(result.accessToken))
    },
  })
}

export function useLogout() {
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken()
      dispatch(credentialsCleared())
      queryClient.clear()
    },
  })
}
