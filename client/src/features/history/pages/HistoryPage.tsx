import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert, Button, Input, Select, Typography } from 'antd'
import type { HistoryFilters, Payment } from '../../../shared/types/models'
import { statusLabel } from '../../../shared/utils/formatters'
import { errorMessage } from '../../../shared/api/errorMessage'
import PaymentHistoryTable from '../components/PaymentHistoryTable'
import { usePaymentHistory } from '../hooks/usePaymentHistory'
import { useLocale } from '../../../shared/providers/useLocale'

export default function HistoryPage() {
  const [params] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<HistoryFilters>(() => ({ status: params.get('status') === 'pending_otp' ? 'pending_otp' : undefined }))
  const [search, setSearch] = useState('')
  const pageSize = 10
  const history = usePaymentHistory(pageSize, (page - 1) * pageSize, filters)
  const { locale, t } = useLocale()
  function updateFilters(values: Partial<HistoryFilters>) { setPage(1); setFilters({ ...filters, ...values }) }

  return <>
    <div className="history-toolbar">
      <Input.Search aria-label={t('Tìm giao dịch', 'Search payments')} placeholder={t('MSSV, tên sinh viên, khoản phí', 'Student ID, student name, fee')}
        value={search} onChange={(event) => setSearch(event.target.value)} allowClear
        onSearch={(value) => updateFilters({ search: value.trim() || undefined })} enterButton />
      <Select aria-label={t('Trạng thái', 'Status')} value={filters.status ?? 'all'} onChange={(value) => updateFilters({ status: value === 'all' ? undefined : value as Payment['status'] })}
        options={[{ value: 'all', label: t('Mọi trạng thái', 'All statuses') }, ...(['pending_otp', 'succeeded', 'failed', 'expired'] as const).map((status) => ({ value: status, label: statusLabel(status, locale) }))]} />
      <label className="history-date"><span>{t('Từ ngày (UTC)', 'From (UTC)')}</span><Input type="date" value={filters.dateFrom ?? ''} max={filters.dateTo} onChange={(event) => updateFilters({ dateFrom: event.target.value || undefined })} /></label>
      <label className="history-date"><span>{t('Đến ngày (UTC)', 'To (UTC)')}</span><Input type="date" value={filters.dateTo ?? ''} min={filters.dateFrom} onChange={(event) => updateFilters({ dateTo: event.target.value || undefined })} /></label>
      <Button onClick={() => { setSearch(''); setFilters({}); setPage(1) }}>{t('Xóa lọc', 'Reset')}</Button>
    </div>
    {history.isError && <Alert className="mb-4" showIcon type="error" message={errorMessage(history.error, locale)}
      action={<Button onClick={() => { void history.refetch() }}>{t('Thử lại', 'Retry')}</Button>} />}
    {Object.values(filters).some(Boolean) && <Typography.Paragraph type="secondary">{t('Kết quả trên toàn bộ lịch sử giao dịch.', 'Results across your full payment history.')}</Typography.Paragraph>}
    <PaymentHistoryTable payments={history.data?.items ?? []} total={history.data?.total ?? 0} loading={history.isFetching}
      filtered={Object.values(filters).some(Boolean)} page={page} pageSize={pageSize} onPageChange={setPage} />
  </>
}
