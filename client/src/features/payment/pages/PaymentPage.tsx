import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPaymentHistory } from '../../history/api/historyApi'
import { Alert, App } from 'antd'
import { useAppDispatch, useAppSelector } from '../../../app/store/hooks'
import { useDashboardData } from '../../dashboard/hooks/useDashboardData'
import { useLocale } from '../../../shared/providers/useLocale'
import { ApiError } from '../../../shared/api/client'
import { errorMessage } from '../../../shared/api/errorMessage'
import { useConfirmPayment, useLookupFee, useStartPayment } from '../hooks/usePaymentMutations'
import {
  otpChanged, paymentDeferred, feeSelected, lookupStarted, paymentIntentCreated,
  studentIdChanged, termsAcceptanceChanged, paymentReceived,
} from '../store/paymentSlice'
import PaymentForm from '../components/PaymentForm'
import LoadingState from '../../../shared/components/feedback/LoadingState'
import ErrorState from '../../../shared/components/feedback/ErrorState'

export default function PaymentPage() {
  const dispatch = useAppDispatch()
  const state = useAppSelector((store) => store.payment)
  const { profileQuery, walletQuery } = useDashboardData()
  const lookup = useLookupFee()
  const start = useStartPayment()
  const confirm = useConfirmPayment()
  const { locale, t } = useLocale()
  const { message } = App.useApp()
  const [attemptsRemaining, setAttemptsRemaining] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())
  const sending = useRef(false)
  const [recoveryId, setRecoveryId] = useState(() => {
    try {
      const id = sessionStorage.getItem('pendingPaymentId')
      if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id
      sessionStorage.removeItem('pendingPaymentId')
      return null
    } catch { return null }
  })
  const recovery = useQuery({
    queryKey: ['payment-history', 'restore', recoveryId],
    queryFn: () => getPaymentHistory(1, 0, { paymentId: recoveryId! }),
    enabled: Boolean(recoveryId && !state.pendingPayment),
    staleTime: 0,
  })
  useEffect(() => {
    if (!recoveryId || !recovery.data) return
    const payment = recovery.data.items.find((item) => item.id === recoveryId)
    if (payment) dispatch(paymentReceived(payment))
    try { if (payment?.status !== 'pending_otp') sessionStorage.removeItem('pendingPaymentId') } catch { /* optional recovery */ }
    // Complete recovery in a callback, after the server query has settled.
    const frame = requestAnimationFrame(() => setRecoveryId(null))
    return () => cancelAnimationFrame(frame)
  }, [dispatch, recovery.data, recoveryId])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (profileQuery.isPending || walletQuery.isPending || (recoveryId && recovery.isPending && !state.pendingPayment)) {
    return <LoadingState message={t('Đang tải tài khoản…', 'Loading account…')} />
  }
  if (recoveryId && recovery.isError && !state.pendingPayment) {
    return <ErrorState description={t('Chưa thể kiểm tra giao dịch đang chờ. Vui lòng thử lại trước khi tạo giao dịch mới.', 'Could not check your pending payment. Retry before starting another payment.')}
      onRetry={() => { void recovery.refetch() }} homePath="/history" homeLabel={t('Kiểm tra lịch sử', 'Check history')} />
  }
  if (profileQuery.isError || (walletQuery.isError && !(walletQuery.error instanceof ApiError && walletQuery.error.status === 404))) {
    const error = profileQuery.error ?? walletQuery.error
    return <ErrorState description={errorMessage(error, locale)}
      onRetry={() => { void profileQuery.refetch(); void walletQuery.refetch() }} />
  }
  if (!profileQuery.data) return null

  const { fee, pendingPayment, otp, termsAccepted, studentId, lastPayment } = state
  const wallet = walletQuery.data ?? null
  const selected = fee?.fees.find((item) => item.id === state.selectedFeeId)
  const selectedFee = fee && selected ? {
    ...fee, tuitionFeeId: selected.id, name: selected.name, amount: selected.amount, isPaid: selected.status === 'paid',
  } : null
  const busy = lookup.isPending || start.isPending || confirm.isPending
  const expired = Boolean(pendingPayment?.otpExpiresAt && Date.parse(pendingPayment.otpExpiresAt) <= now)
  const canPay = Boolean(selectedFee && wallet && !selectedFee.isPaid &&
    Number(wallet.availableBalance) >= Number(selectedFee.amount) && termsAccepted && !pendingPayment)
  const error = lookup.error ?? start.error ?? confirm.error
  const otpError = confirm.error instanceof ApiError && confirm.error.status === 400 && /OTP/i.test(confirm.error.message)
  const secondsRemaining = Math.max(0, Math.ceil((Date.parse(pendingPayment?.otpExpiresAt ?? '') - now) / 1000)) || 0

  function clearErrors() { lookup.reset(); start.reset(); confirm.reset() }
  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || pendingPayment || !studentId.trim()) return
    clearErrors()
    dispatch(lookupStarted())
    lookup.mutate(studentId.trim())
  }
  function handleStart() {
    if (!selectedFee?.tuitionFeeId || !canPay || busy || sending.current) return
    sending.current = true
    clearErrors()
    // Keep this key after transport/server errors; the next click retries the same intent.
    const key = state.idempotencyKey ?? crypto.randomUUID()
    dispatch(paymentIntentCreated(key))
    start.mutate({ studentId: selectedFee.studentId, tuitionFeeId: selectedFee.tuitionFeeId,
      agreeTerms: termsAccepted, idempotencyKey: key }, { onSettled: () => { sending.current = false } })
  }
  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingPayment || busy || sending.current || expired || attemptsRemaining[pendingPayment.id] === 0 || !/^\d{6}$/.test(otp)) return
    sending.current = true
    confirm.reset()
    const paymentId = pendingPayment.id
    confirm.mutate({ paymentId, otp }, { onError: (failure) => {
      if (failure instanceof ApiError && failure.otpAttemptsRemaining !== undefined) {
        setAttemptsRemaining((previous) => ({ ...previous, [paymentId]: failure.otpAttemptsRemaining! }))
      } else if (failure instanceof ApiError && failure.status === 429) {
        setAttemptsRemaining((previous) => ({ ...previous, [paymentId]: 0 }))
      }
    }, onSettled: () => { sending.current = false } })
  }

  return <>
    {!wallet && <Alert className="mb-4" showIcon type="warning"
      message={t('Tài khoản chưa có ví. Bạn vẫn có thể tra cứu học phí.', 'No wallet is configured. You can still look up fees.')} />}
    {error && !otpError && <Alert className="mb-4" showIcon type="error"
      message={errorMessage(error, locale)}
      description={lookup.error ? t('Kiểm tra MSSV và thử tra cứu lại.', 'Check the student ID and try again.')
        : error instanceof ApiError && (error.status === undefined || error.status >= 500)
          ? t('Chưa xác định được kết quả. Kiểm tra lịch sử trước khi tạo giao dịch khác.', 'The outcome is uncertain. Check history before starting another payment.') : undefined}
      closable onClose={clearErrors} />}
    {lastPayment && ['expired', 'failed'].includes(lastPayment.status) && <Alert className="mb-4" showIcon type="warning"
      message={t('Giao dịch đã kết thúc. Chọn lại khoản phí để tạo yêu cầu mới.', 'The payment has ended. Select a fee to start again.')} />}
    <PaymentForm profile={profileQuery.data} wallet={wallet} fee={fee} selectedFee={selectedFee}
      studentId={studentId} termsAccepted={termsAccepted} pendingPayment={pendingPayment}
      lastPayment={lastPayment} otp={otp} busy={busy} expired={expired} canPay={canPay}
      lookupBusy={lookup.isPending}
      otpError={otpError} secondsRemaining={secondsRemaining}
      otpAttemptsRemaining={pendingPayment ? attemptsRemaining[pendingPayment.id] : undefined}
      onStudentIdChange={(value) => { clearErrors(); dispatch(studentIdChanged(value)) }}
      onFeeSelect={(value) => { clearErrors(); dispatch(feeSelected(value)) }}
      onTermsAcceptedChange={(value) => dispatch(termsAcceptanceChanged(value))}
      onOtpChange={(value) => { if (confirm.isError) confirm.reset(); dispatch(otpChanged(value)) }}
      onLookupFee={handleLookup} onStartPayment={handleStart} onConfirmPayment={handleConfirm}
      onDeferPayment={() => {
        clearErrors()
        dispatch(paymentDeferred())
        if (!expired) void message.info(t('Giao dịch vẫn được giữ. Bạn có thể tiếp tục trong Lịch sử.', 'Your payment is still pending. You can resume it in History.'))
      }} />
  </>
}
