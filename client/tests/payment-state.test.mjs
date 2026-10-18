import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

// Node 24 strips TypeScript. Resolve the extensionless imports used by Vite.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
        return nextResolve(`${specifier}.ts`, context)
      }
      throw error
    }
  },
})
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: { getItem: () => null },
})

const { default: reducer, ...actions } = await import('../src/features/payment/store/paymentSlice.ts')
const { startPayment } = await import('../src/features/payment/api/paymentApi.ts')
const { http } = await import('../src/shared/api/client.ts')

const fee = {
  studentId: 'SV001', studentName: 'Student', amount: '850000.00', isPaid: false,
  tuitionFeeId: 'fee-one', name: 'Semester 1',
  fees: [
    { id: 'fee-one', name: 'Semester 1', amount: '850000.00', status: 'unpaid' },
    { id: 'fee-two', name: 'Semester 2', amount: '1200000.00', status: 'unpaid' },
  ],
}
const pending = {
  id: 'payment-one', tuitionFeeId: 'fee-two', feeName: 'Semester 2',
  studentId: 'SV001', studentName: 'Student', amount: '1200000.00',
  status: 'pending_otp', otpExpiresAt: '2026-10-18T08:05:00Z',
  createdAt: '2026-10-18T08:00:00Z', completedAt: null, balanceBefore: null,
  idempotencyKey: 'stable-retry-key', termsAcceptedAt: '2026-10-18T08:00:00Z',
}

test('multiple semesters require selection; consent resets when selecting another fee', () => {
  let state = reducer(undefined, actions.feeLookedUp(fee))
  assert.equal(state.selectedFeeId, null)
  state = reducer(state, actions.feeSelected('fee-one'))
  state = reducer(state, actions.termsAcceptanceChanged(true))
  state = reducer(state, actions.feeSelected('fee-two'))
  assert.equal(state.selectedFeeId, 'fee-two')
  assert.equal(state.termsAccepted, false)
})

test('confirmation updates only the paid semester and retains its receipt', () => {
  let state = reducer(undefined, actions.feeLookedUp(fee))
  state = reducer(state, actions.feeSelected('fee-two'))
  state = reducer(state, actions.paymentReceived(pending))
  state = reducer(state, actions.paymentReceived({
    ...pending, status: 'succeeded', completedAt: '2026-10-18T08:01:00Z', balanceBefore: '5000000.00',
  }))
  assert.equal(state.fee.fees[0].status, 'unpaid')
  assert.equal(state.fee.fees[1].status, 'paid')
  assert.equal(state.pendingPayment, null)
  assert.equal(state.lastPayment.balanceBefore, '5000000.00')
})

test('pending payment locks its target and retains the server retry key', () => {
  let state = reducer(undefined, actions.paymentReceived(pending))
  state = reducer(state, actions.feeSelected('different-fee'))
  state = reducer(state, actions.studentIdChanged('different-student'))
  assert.equal(state.pendingPayment.tuitionFeeId, 'fee-two')
  assert.equal(state.idempotencyKey, 'stable-retry-key')
  assert.equal(state.studentId, pending.studentId)
})

test('defer A, start B, then resume A without renewing its OTP or mixing keys', () => {
  let state = reducer(undefined, actions.feeLookedUp(fee))
  state = reducer(state, actions.paymentReceived(pending))
  state = reducer(state, actions.otpChanged('123456'))
  const original = structuredClone(state.pendingPayment)
  state = reducer(state, actions.paymentDeferred())
  assert.equal(state.pendingPayment, null)
  assert.equal(state.lastPayment, null)
  assert.equal(state.otp, '')
  assert.equal(state.idempotencyKey, null)
  assert.equal(state.termsAccepted, false)
  assert.equal(state.fee.studentId, 'SV001')
  assert.equal(state.selectedFeeId, null)

  state = reducer(state, actions.feeSelected('fee-one'))
  state = reducer(state, actions.paymentIntentCreated('another-retry-key'))
  const another = { ...pending, id: 'payment-two', tuitionFeeId: 'fee-one', idempotencyKey: 'another-retry-key' }
  state = reducer(state, actions.paymentReceived(another))
  state = reducer(state, actions.otpChanged('654321'))
  state = reducer(state, actions.paymentDeferred())
  state = reducer(state, actions.paymentReceived(original))
  assert.equal(state.pendingPayment.id, 'payment-one')
  assert.equal(state.pendingPayment.otpExpiresAt, pending.otpExpiresAt)
  assert.equal(state.idempotencyKey, pending.idempotencyKey)
  assert.equal(state.selectedFeeId, pending.tuitionFeeId)
  assert.equal(state.otp, '')
  assert.deepEqual(original, pending)
})

test('resuming another student clears the old lookup and restores the right target', () => {
  let state = reducer(undefined, actions.feeLookedUp(fee))
  state = reducer(state, actions.paymentReceived({ ...pending, studentId: 'SV002', tuitionFeeId: 'other-fee' }))
  assert.equal(state.studentId, 'SV002')
  assert.equal(state.selectedFeeId, 'other-fee')
  assert.equal(state.fee, null)
})

test('completing B does not change the original pending A when resumed from history', () => {
  let state = reducer(undefined, actions.paymentReceived(pending))
  const savedA = structuredClone(state.pendingPayment)
  state = reducer(state, actions.paymentDeferred())
  state = reducer(state, actions.paymentReceived({ ...pending, id: 'B', tuitionFeeId: 'fee-one', status: 'succeeded' }))
  state = reducer(state, actions.paymentReceived(savedA))
  assert.equal(state.pendingPayment.id, pending.id)
  assert.equal(state.pendingPayment.status, 'pending_otp')
  assert.equal(state.pendingPayment.otpExpiresAt, pending.otpExpiresAt)
})

test('editing the student removes stale lookup and consent', () => {
  let state = reducer(undefined, actions.feeLookedUp(fee))
  state = reducer(state, actions.termsAcceptanceChanged(true))
  state = reducer(state, actions.studentIdChanged('SV002'))
  assert.equal(state.fee, null)
  assert.equal(state.termsAccepted, false)
})

test('sign-out and switching accounts clear pending payment and OTP', () => {
  for (const type of ['auth/credentialsCleared', 'auth/credentialsStored']) {
    let state = reducer(undefined, actions.paymentReceived(pending))
    state = reducer(state, actions.otpChanged('123456'))
    state = reducer(state, { type, payload: 'new-account-token' })
    assert.equal(state.pendingPayment, null)
    assert.equal(state.otp, '')
    assert.equal(state.idempotencyKey, null)
  }
})

test('checkout retries send the same key and explicit fee without a client amount', async () => {
  const requests = []
  const original = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    requests.push(JSON.parse(config.data))
    if (requests.length === 1) throw new Error('Lost connection')
    return { data: pending, status: 201, statusText: 'Created', headers: {}, config }
  }
  try {
    const body = { studentId: 'SV001', tuitionFeeId: 'fee-two', agreeTerms: true, idempotencyKey: 'stable-retry-key' }
    await assert.rejects(startPayment(body), /Lost connection/)
    const result = await startPayment(body)
    assert.deepEqual(requests, [body, body])
    assert.equal(result.id, 'payment-one')
    assert.equal('amount' in requests[0], false)
  } finally { http.defaults.adapter = original }
})
