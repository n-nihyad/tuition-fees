import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Fee, Payment } from '../../../shared/types/models'
import { credentialsCleared, credentialsStored } from '../../auth/store/authSlice'

type PaymentState = {
  studentId: string
  termsAccepted: boolean
  fee: Fee | null
  selectedFeeId: string | null
  idempotencyKey: string | null
  pendingPayment: Payment | null
  lastPayment: Payment | null
  otp: string
}

const initialState: PaymentState = {
  studentId: '', termsAccepted: false, fee: null, selectedFeeId: null,
  idempotencyKey: null, pendingPayment: null, lastPayment: null, otp: '',
}

const paymentSlice = createSlice({
  name: 'payment', initialState,
  reducers: {
    studentIdChanged(state, action: PayloadAction<string>) {
      if (state.pendingPayment) return
      state.studentId = action.payload
      state.fee = null
      state.selectedFeeId = null
      state.idempotencyKey = null
      state.termsAccepted = false
      state.lastPayment = null
    },
    termsAcceptanceChanged(state, action: PayloadAction<boolean>) {
      state.termsAccepted = action.payload
    },
    lookupStarted(state) {
      state.fee = null
      state.selectedFeeId = null
      state.lastPayment = null
      // Keep the retry key until a different target is actually selected.
    },
    feeLookedUp(state, action: PayloadAction<Fee>) {
      state.fee = action.payload
      state.selectedFeeId = action.payload.fees.length === 1 ? action.payload.fees[0].id : null
      state.termsAccepted = false
    },
    feeSelected(state, action: PayloadAction<string>) {
      if (state.pendingPayment || state.selectedFeeId === action.payload) return
      state.selectedFeeId = action.payload
      state.idempotencyKey = null
      state.termsAccepted = false
      state.lastPayment = null
    },
    paymentIntentCreated(state, action: PayloadAction<string>) {
      state.idempotencyKey = action.payload
    },
    paymentReceived(state, action: PayloadAction<Payment>) {
      const payment = action.payload
      state.lastPayment = payment
      state.otp = ''
      state.pendingPayment = payment.status === 'pending_otp' ? payment : null
      state.idempotencyKey = payment.status === 'pending_otp' ? payment.idempotencyKey : null
      if (payment.status === 'pending_otp') {
        // Restoring from history must not keep another student's lookup context.
        state.studentId = payment.studentId
        state.selectedFeeId = payment.tuitionFeeId
        state.termsAccepted = false
        if (state.fee?.studentId !== payment.studentId) state.fee = null
      }
      if (payment.status === 'succeeded' && state.fee) {
        const item = state.fee.fees.find((fee) => fee.id === payment.tuitionFeeId)
        if (item) item.status = 'paid'
        if (state.fee.tuitionFeeId === payment.tuitionFeeId) state.fee.isPaid = true
      }
    },
    otpChanged(state, action: PayloadAction<string>) { state.otp = action.payload },
    paymentDeferred(state) {
      // Leave the server payment and OTP deadline untouched. History can resume it.
      state.pendingPayment = null
      state.lastPayment = null
      state.selectedFeeId = null
      state.idempotencyKey = null
      state.otp = ''
      state.termsAccepted = false
    },
    paymentFlowReset() { return initialState },
  },
  extraReducers: (builder) => {
    builder.addCase(credentialsCleared, () => initialState)
    builder.addCase(credentialsStored, () => initialState)
  },
})

export const {
  studentIdChanged, termsAcceptanceChanged, lookupStarted, feeLookedUp, feeSelected,
  paymentIntentCreated, paymentReceived, otpChanged, paymentDeferred, paymentFlowReset,
} = paymentSlice.actions
export default paymentSlice.reducer
