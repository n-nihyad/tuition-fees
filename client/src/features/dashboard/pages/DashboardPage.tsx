import DashboardOverview from '../components/DashboardOverview'
import { usePaymentHistory } from '../../history/hooks/usePaymentHistory'
import { useLocale } from '../../../shared/providers/useLocale'
import LoadingState from '../../../shared/components/feedback/LoadingState'
import ErrorState from '../../../shared/components/feedback/ErrorState'
import { errorMessage } from '../../../shared/api/errorMessage'

export default function DashboardPage() {
  const history = usePaymentHistory(20, 0)
  const { locale, t } = useLocale()

  if (history.isPending) return <LoadingState message={t('Đang tải tổng quan giao dịch của bạn…', 'Loading your transaction overview…')} />
  if (history.isError) {
    return (
      <ErrorState
        description={errorMessage(history.error, locale)}
        onRetry={() => { void history.refetch() }}
      />
    )
  }

  return <DashboardOverview payments={history.data.items} statusCounts={history.data.statusCounts} />
}
