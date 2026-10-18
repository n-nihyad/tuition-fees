export type Profile = {
  id: string
  mssv: string | null
  fullName: string
  phone: string
  email: string
  role: string
}

export type Wallet = { availableBalance: number | string }

export type FeeItem = {
  id: string
  name: string
  amount: number | string
  status: 'unpaid' | 'paid'
}

export type Fee = {
  studentId: string
  studentName: string
  amount: number | string
  isPaid: boolean
  tuitionFeeId: string | null
  name: string | null
  fees: FeeItem[]
}

export type Payment = {
  id: string
  tuitionFeeId: string
  feeName: string
  studentId: string
  studentName: string
  amount: number | string
  status: 'pending_otp' | 'succeeded' | 'failed' | 'expired'
  otpExpiresAt: string | null
  createdAt: string
  completedAt: string | null
  balanceBefore: number | string | null
  idempotencyKey: string
  termsAcceptedAt: string
}

export type PaymentHistory = { items: Payment[]; total: number; statusCounts?: Partial<Record<Payment['status'], number>> }
export type HistoryFilters = { status?: Payment['status']; search?: string; dateFrom?: string; dateTo?: string; paymentId?: string }
export type LoginResult = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: string
}
