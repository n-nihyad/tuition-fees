import { PortalIcon } from '../../../shared/components/brand/PortalIcon'
import { Button, Card, Descriptions, Empty, Grid, Table, Tag, Typography } from 'antd'
import PaymentStatusTag from '../../../shared/components/feedback/PaymentStatusTag'
import type { TableColumnsType } from 'antd'
import { useNavigate, useSearchParams } from 'react-router'
import { useIsMutating } from '@tanstack/react-query'
import { useAppDispatch } from '../../../app/store/hooks'
import { paymentReceived } from '../../payment/store/paymentSlice'
import type { Payment } from '../../../shared/types/models'
import { useLocale } from '../../../shared/providers/useLocale'
import { dateTime, money } from '../../../shared/utils/formatters'

type Props = {
  payments: Payment[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  loading?: boolean
  filtered?: boolean
}

export default function PaymentHistoryTable({ payments, total, page, pageSize, onPageChange, loading, filtered }: Props) {
  const { locale, t } = useLocale()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const paymentBusy = useIsMutating({ mutationKey: ['payment'] }) > 0
  const screens = Grid.useBreakpoint()
  function resume(item: Payment) { dispatch(paymentReceived(item)); navigate('/payment') }
  const columns: TableColumnsType<Payment> = [
    { title: t('Thời gian', 'Date'), dataIndex: 'createdAt', width: 190, responsive: ['md'],
      render: (value: string) => dateTime(value, locale) },
    { title: t('Khoản phí', 'Fee'), key: 'student',
      render: (_, item) => <div className="grid gap-1">
        <Typography.Text strong>{item.feeName}</Typography.Text>
        <Typography.Text type="secondary">{item.studentId} · {item.studentName}</Typography.Text>
        {!screens.md && <>
          <Typography.Text type="secondary">{dateTime(item.createdAt, locale)}</Typography.Text>
          <div className="mobile-payment-summary"><Typography.Text strong>{money(item.amount, locale)}</Typography.Text><PaymentStatusTag status={item.status} /></div>
          {item.status === 'pending_otp' && <Button className="history-resume" disabled={paymentBusy} onClick={(event) => { event.stopPropagation(); resume(item) }}>{t('Tiếp tục thanh toán', 'Resume payment')}</Button>}
        </>}
      </div> },
    { title: t('Số tiền', 'Amount'), dataIndex: 'amount', width: 170, align: 'right', responsive: ['md'],
      render: (value: number | string) => <Typography.Text strong>{money(value, locale)}</Typography.Text> },
    { title: t('Trạng thái', 'Status'), dataIndex: 'status', width: 165, responsive: ['md'],
      render: (value: Payment['status']) => <PaymentStatusTag status={value} /> },
    { title: '', key: 'action', width: 120, responsive: ['md'], render: (_, item) => item.status === 'pending_otp'
      ? <Button className="history-resume" size="small" icon={<PortalIcon name="arrow" />} disabled={paymentBusy} onClick={(event) => { event.stopPropagation(); dispatch(paymentReceived(item)); navigate('/payment') }}>{t('Tiếp tục', 'Resume')}</Button>
      : null },
  ]
  return <Card className="rose-history rounded-2xl border-brand-line shadow-sm"
    title={t('Lịch sử giao dịch', 'Payment history')}
    extra={<Tag>{total} {t('giao dịch', 'payments')}</Tag>}>
    <Table<Payment> rowKey="id" columns={columns} dataSource={payments} loading={loading} scroll={screens.md ? { x: 820 } : undefined}
      pagination={{ current: page, pageSize, total, onChange: onPageChange, showSizeChanger: false }}
      locale={{ emptyText: <Empty image={<PortalIcon name="history" className="empty-history-icon" />} description={filtered ? t('Không có giao dịch phù hợp. Thử đổi bộ lọc.', 'No matching payments. Try changing your filters.') : t('Chưa có giao dịch nào', 'No payments yet')} /> }}
      expandable={{ defaultExpandedRowKeys: params.get('payment') ? [params.get('payment')!] : [], expandRowByClick: true, expandedRowRender: (item) => <div className="interactive-reveal"><Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
        { key: 'id', label: t('Mã giao dịch', 'Payment ID'), children: <span className="break-all">{item.id}</span> },
        { key: 'method', label: t('Nguồn thanh toán', 'Payment source'), children: t('Ví tài khoản', 'Account wallet') },
        { key: 'before', label: t('Số dư trước thanh toán', 'Balance before payment'), children: item.balanceBefore === null ? '—' : money(item.balanceBefore, locale) },
        { key: 'completed', label: t('Hoàn tất lúc', 'Completed at'), children: item.completedAt ? dateTime(item.completedAt, locale) : '—' },
        { key: 'terms', label: t('Đồng ý điều khoản lúc', 'Terms accepted at'), children: dateTime(item.termsAcceptedAt, locale) },
        { key: 'expiry', label: t('Thời hạn OTP', 'OTP deadline'), children: item.otpExpiresAt ? dateTime(item.otpExpiresAt, locale) : '—' },
      ]} /></div> }} />
  </Card>
}
