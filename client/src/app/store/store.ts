import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../../features/auth/store/authSlice'
import paymentReducer from '../../features/payment/store/paymentSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    payment: paymentReducer,
  },
})

// Store only a pointer; a reload must re-fetch the authorized server record.
let previousPaymentId = store.getState().payment.pendingPayment?.id ?? null
let previousToken = store.getState().auth.accessToken
store.subscribe(() => {
  const { auth, payment } = store.getState()
  const id = payment.pendingPayment?.id ?? null
  try {
    if (auth.accessToken !== previousToken) sessionStorage.removeItem('pendingPaymentId')
    if (id !== previousPaymentId) {
      if (id) sessionStorage.setItem('pendingPaymentId', id)
      else sessionStorage.removeItem('pendingPaymentId')
    }
  } catch { /* A restricted browser can still use the in-memory payment flow. */ }
  previousPaymentId = id
  previousToken = auth.accessToken
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
