import { BankOutlined } from '@ant-design/icons'
import { useLocale } from '../../providers/useLocale'

type LoadingStateProps = {
  message?: string
  fullScreen?: boolean
}

export default function LoadingState({ message, fullScreen = false }: LoadingStateProps) {
  const { t } = useLocale()
  const Container = fullScreen ? 'main' : 'section'

  return (
    <Container
      className={`feedback-screen ${fullScreen ? 'feedback-screen--full rose-ui' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {fullScreen && <div className="ambient-wash" aria-hidden="true" />}
      <section className="feedback-card loading-card">
        <div className="loading-visual" aria-hidden="true">
          <span className="loading-orbit loading-orbit--outer" />
          <span className="loading-orbit loading-orbit--inner" />
          <span className="loading-emblem"><BankOutlined /></span>
        </div>
        <span className="feedback-eyebrow">{t('HỌC PHÍ SỐ', 'TUITION PORTAL')}</span>
        <h1 className="feedback-title">{t('Đang tải dữ liệu', 'Loading your information')}</h1>
        <p className="feedback-description">
          {message ?? t('Chờ một chút nhé.', 'Just a moment.')}
        </p>
        <div className="loading-progress" aria-hidden="true"><span /></div>
      </section>
    </Container>
  )
}
