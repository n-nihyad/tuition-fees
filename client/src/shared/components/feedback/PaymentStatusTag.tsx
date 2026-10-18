import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { useLocale } from '../../providers/useLocale'
import { statusLabel } from '../../utils/formatters'
import type { Payment } from '../../types/models'

const appearance = {
  pending_otp: { color: 'processing', icon: <ClockCircleOutlined /> },
  succeeded: { color: 'success', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', icon: <CloseCircleOutlined /> },
  expired: { color: 'default', icon: <MinusCircleOutlined /> },
}
const colors = {
  pending_otp: { color: '#38536c', backgroundColor: '#edf3f8' },
  succeeded: { color: '#275f40', backgroundColor: '#edf7ee' },
  failed: { color: '#9b3543', backgroundColor: '#fff1f2' },
  expired: { color: '#53645a', backgroundColor: '#f0f3ef' },
}
export default function PaymentStatusTag({ status }: { status: Payment['status'] }) {
  const { locale } = useLocale()
  return <Tag className="payment-status-tag" style={colors[status]} {...appearance[status]}>{statusLabel(status, locale)}</Tag>
}
