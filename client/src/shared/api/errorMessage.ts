import { ApiError } from './client'
import type { Locale } from '../providers/locale-context'

// Translate at render time so an existing error also follows a language switch.
const messages: [string, string][] = [
  ['Username hoặc mật khẩu không chính xác.', 'The username or password is incorrect.'],
  ['Token không hợp lệ hoặc đã hết hạn.', 'Your session is invalid or has expired. Please sign in again.'],
  ['Không tìm thấy khoản học phí của MSSV này.', 'No tuition fee was found for this student ID.'],
  ['Tài khoản chưa được khởi tạo ví thanh toán.', 'A payment wallet has not been set up for this account.'],
  ['Bạn cần đồng ý với điều khoản thanh toán.', 'Please accept the payment terms.'],
  ['Khoản học phí này đã được thanh toán.', 'This tuition fee has already been paid.'],
  ['Khoản học phí đã được thanh toán.', 'The tuition fee has already been paid.'],
  ['Số dư khả dụng không đủ để thanh toán toàn bộ học phí.', 'Your available balance is insufficient to pay this fee in full.'],
  ['Số dư khả dụng không còn đủ để thanh toán.', 'Your available balance is no longer sufficient for this payment.'],
  ['Khoản học phí đang có giao dịch chờ xác thực OTP.', 'This fee already has a payment awaiting confirmation. Resume it in History.'],
  ['Chưa cấu hình SMTP để gửi OTP.', 'OTP email delivery is not configured. Please contact support.'],
  ['Dịch vụ OTP tạm thời không khả dụng.', 'The OTP service is temporarily unavailable. Please try again later.'],
  ['Dịch vụ xác thực OTP tạm thời không khả dụng.', 'OTP verification is temporarily unavailable. Please try again later.'],
  ['OTP không hợp lệ hoặc đã hết hạn.', 'The OTP is invalid or has expired.'],
  ['Mã OTP đã hết hạn.', 'The OTP has expired. Check your payment history before starting again.'],
  ['Không tìm thấy giao dịch.', 'The payment was not found.'],
  ['Giao dịch không còn ở trạng thái chờ xác thực.', 'This payment is no longer awaiting confirmation. Check its status in History.'],
  ['Số tiền học phí đã thay đổi; vui lòng tạo giao dịch mới.', 'The tuition amount has changed. Please start a new payment.'],
  ['Không tìm thấy khoản học phí của giao dịch đã hoàn tất.', 'The tuition fee for the completed payment could not be found. Please contact support.'],
  ['Ngày bắt đầu phải trước ngày kết thúc.', 'The start date must be on or before the end date.'],
  ['Tài khoản hoặc khoản học phí đang được xử lý.', 'This account or fee is being processed. Please wait and try again.'],
  ['Không thể cấp mã OTP duy nhất. Vui lòng thử lại.', 'An OTP could not be issued. Please try again.'],
  ['Đã vượt quá số lần nhập OTP cho giao dịch này.', 'The OTP submission limit for this payment has been reached.'],
  ['Giao dịch đang được xác thực.', 'This payment is already being verified. Please wait and check History.'],
  ['Không thể xác thực tài khoản với User Service.', 'Account verification is temporarily unavailable. Please try again later.'],
  ['User Service trả về phản hồi không hợp lệ.', 'The account service returned an invalid response. Please try again later.'],
  ['User Service trả về hồ sơ không hợp lệ.', 'Your account information could not be loaded. Please try again later.'],
  ['Chỉ tài khoản người nộp học phí mới được thanh toán.', 'Only payer accounts can make payments.'],
  ['Chỉ tài khoản người nộp học phí mới được tra cứu.', 'Only payer accounts can look up tuition fees.'],
  ['Payment Service không khả dụng.', 'The payment service is temporarily unavailable. Please try again later.'],
  ['Payment Service trả về phản hồi không hợp lệ.', 'The payment service returned an invalid response. Please try again later.'],
  ['Payment Service trả về khoản học phí không hợp lệ.', 'Tuition fee information could not be loaded. Please try again later.'],
  ['Có nhiều khoản học phí. Vui lòng chọn một khoản.', 'Multiple fees; supply tuitionFeeId.'],
  ['Không tìm thấy khoản học phí.', 'Tuition fee not found.'],
  ['Khóa yêu cầu đã được dùng cho khoản phí khác. Vui lòng chọn lại khoản phí.', 'Idempotency key already used for another fee.'],
  ['Không gửi được email OTP. Vui lòng kiểm tra lịch sử trước khi thử lại.', 'OTP email delivery failed.'],
  ['Không tìm thấy giao dịch.', 'Payment not found.'],
  ['Mã OTP đã hết hạn. Kiểm tra lịch sử trước khi tạo lại.', 'OTP expired.'],
  ['Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.', 'Upstream service is unavailable.'],
  ['Không tìm thấy chức năng được yêu cầu.', 'API route not found.'],
  ['Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.', 'Session changed while the request was in progress.'],
]

function validationMessage(error: ApiError, locale: Locale): string | null {
  const cause = error.cause as { response?: { data?: { detail?: unknown } } } | undefined
  const detail = cause?.response?.data?.detail
  if (!Array.isArray(detail)) return null
  const labels: Record<string, [string, string]> = {
    username: ['Tên đăng nhập', 'Username'], password: ['Mật khẩu', 'Password'],
    studentId: ['Mã số sinh viên', 'Student ID'], tuitionFeeId: ['Khoản học phí', 'Tuition fee'],
    otp: ['Mã OTP', 'OTP'], agreeTerms: ['Điều khoản thanh toán', 'Payment terms'],
    dateFrom: ['Từ ngày', 'Start date'], dateTo: ['Đến ngày', 'End date'],
    status: ['Trạng thái', 'Status'], paymentId: ['Mã giao dịch', 'Payment ID'],
  }
  const index = locale === 'vi' ? 0 : 1
  return detail.map((entry: unknown) => {
    const item = entry as { loc?: unknown[]; type?: string } | null
    const field = Array.isArray(item?.loc) ? String(item.loc.at(-1)) : ''
    const label = labels[field]?.[index] ?? (locale === 'vi' ? 'Dữ liệu' : 'Input')
    if (field === 'otp' && item?.type === 'string_pattern_mismatch') {
      return locale === 'vi' ? 'Mã OTP phải gồm đúng 6 chữ số.' : 'The OTP must contain exactly 6 digits.'
    }
    return `${label}: ${locale === 'vi' ? (item?.type === 'missing' ? 'không được bỏ trống.' : 'giá trị không hợp lệ.') : (item?.type === 'missing' ? 'is required.' : 'is invalid.')}`
  }).join(' ')
}

export function errorMessage(error: unknown, locale: Locale): string {
  const raw = error instanceof Error ? error.message.trim() : ''
  const known = messages.find(([vi, en]) => raw === vi || raw === en)
  if (known) return known[locale === 'vi' ? 0 : 1]
  if (error instanceof ApiError) {
    const validation = validationMessage(error, locale)
    if (validation) return validation
    const code = (error.cause as { code?: string } | undefined)?.code
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return locale === 'vi' ? 'Yêu cầu quá thời gian chờ. Vui lòng kiểm tra kết nối và thử lại.' : 'The request timed out. Please check your connection and try again.'
    }
    if (locale === 'vi' && error.status !== undefined && raw && !/^Request failed with status code/.test(raw)) return raw
    const fallback: Record<number, [string, string]> = {
      400: ['Yêu cầu không hợp lệ. Vui lòng kiểm tra thông tin.', 'The request is invalid. Please check your input.'],
      401: ['Vui lòng đăng nhập lại để tiếp tục.', 'Please sign in again to continue.'],
      403: ['Bạn không có quyền thực hiện thao tác này.', 'You do not have permission to perform this action.'],
      404: ['Không tìm thấy dữ liệu được yêu cầu.', 'The requested information was not found.'],
      409: ['Trạng thái đã thay đổi. Vui lòng kiểm tra và thử lại.', 'The status has changed. Please check and try again.'],
      422: ['Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.', 'Some information is invalid. Please check your input.'],
      429: ['Quá nhiều yêu cầu. Vui lòng thử lại sau.', 'Too many requests. Please try again later.'],
    }
    if (error.status === undefined) return locale === 'vi' ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối.' : 'Could not connect to the server. Please check your connection.'
    if (fallback[error.status]) return fallback[error.status][locale === 'vi' ? 0 : 1]
  }
  return locale === 'vi' ? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại sau.' : 'The request could not be completed. Please try again later.'
}
