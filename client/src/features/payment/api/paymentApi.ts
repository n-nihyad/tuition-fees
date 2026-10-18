import { http } from '../../../shared/api/client'
import type { Fee, Payment } from '../../../shared/types/models'

export async function lookupFee(studentId: string): Promise<Fee> {
  const { data } = await http.get<Fee>(
    `/api/tuition/fees/${encodeURIComponent(studentId)}`,
  )
  return data
}

export type StartPaymentRequest = {
  studentId: string
  tuitionFeeId: string
  agreeTerms: boolean
  idempotencyKey: string
}

export async function startPayment(body: StartPaymentRequest): Promise<Payment> {
  const { data } = await http.post<Payment>('/api/payments', body, { timeout: 30_000 })
  return data
}

export async function confirmPayment(paymentId: string, otp: string): Promise<Payment> {
  const { data } = await http.post<Payment>(
    `/api/payments/${encodeURIComponent(paymentId)}/confirm`,
    { otp },
    { timeout: 30_000 },
  )
  return data
}
