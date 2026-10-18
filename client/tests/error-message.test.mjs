import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return nextResolve(`${specifier}.ts`, context)
      throw error
    }
  },
})
const { ApiError } = await import('../src/shared/api/client.ts')
const { errorMessage } = await import('../src/shared/api/errorMessage.ts')

test('known backend messages follow the selected locale without mutating the error', () => {
  const error = new ApiError('Username hoặc mật khẩu không chính xác.', 401, undefined)
  assert.equal(errorMessage(error, 'en'), 'The username or password is incorrect.')
  assert.equal(errorMessage(error, 'vi'), error.message)
  assert.equal(error.message, 'Username hoặc mật khẩu không chính xác.')
  assert.equal(errorMessage(new ApiError('Không tìm thấy khoản học phí của MSSV này.', 404, undefined), 'en'), 'No tuition fee was found for this student ID.')
  assert.equal(errorMessage(new ApiError('Đã vượt quá số lần nhập OTP cho giao dịch này.', 429, undefined), 'en'), 'The OTP submission limit for this payment has been reached.')
})

test('unknown and network failures have localized fallbacks without leaking server detail in English', () => {
  assert.equal(errorMessage(new ApiError('Thông báo mới từ máy chủ.', 503, undefined), 'en'), 'The request could not be completed. Please try again later.')
  assert.equal(errorMessage(new ApiError('Network Error', undefined, {}), 'en'), 'Could not connect to the server. Please check your connection.')
  assert.equal(errorMessage(new ApiError('timeout', undefined, { code: 'ECONNABORTED' }), 'en'), 'The request timed out. Please check your connection and try again.')
  assert.equal(errorMessage(new ApiError('Request failed with status code 403', 403, {}), 'vi'), 'Bạn không có quyền thực hiện thao tác này.')
})

test('FastAPI validation fields and OTP rules are localized', () => {
  const error = new ApiError('raw validation message', 422, { response: { data: { detail: [
    { loc: ['body', 'username'], type: 'missing' },
    { loc: ['body', 'otp'], type: 'string_pattern_mismatch' },
  ] } } })
  assert.equal(errorMessage(error, 'en'), 'Username: is required. The OTP must contain exactly 6 digits.')
  assert.equal(errorMessage(error, 'vi'), 'Tên đăng nhập: không được bỏ trống. Mã OTP phải gồm đúng 6 chữ số.')
})
