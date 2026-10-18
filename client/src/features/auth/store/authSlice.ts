import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getAccessToken } from '../../../shared/auth/tokenStorage'

type AuthState = {
  accessToken: string | null
}

const initialState: AuthState = {
  accessToken: getAccessToken(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsStored(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    credentialsCleared(state) {
      state.accessToken = null
    },
  },
})

export const { credentialsStored, credentialsCleared } = authSlice.actions
export default authSlice.reducer
