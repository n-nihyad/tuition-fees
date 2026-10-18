export function money(value: number | string, locale: 'vi' | 'en' = 'vi'): string {
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Number(value))} ₫`
}

export function dateTime(value: string, locale: 'vi' | 'en' = 'vi'): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function statusLabel(status: string, locale: 'vi' | 'en' = 'vi'): string {
  const labels: Record<string, { vi: string; en: string }> = {
    pending_otp: { vi: 'Chờ xác thực', en: 'Awaiting confirmation' },
    succeeded: { vi: 'Thành công', en: 'Successful' },
    failed: { vi: 'Thất bại', en: 'Failed' },
    expired: { vi: 'Hết hạn', en: 'Expired' },
  }
  return labels[status]?.[locale] ?? status
}

export function statusClassName(status: string): string {
  const classes: Record<string, string> = {
    pending_otp: 'status-tag--pending',
    succeeded: 'status-tag--success',
    failed: 'status-tag--failed',
    expired: 'status-tag--expired',
  }
  return `status-tag ${classes[status] ?? 'status-tag--default'}`
}
