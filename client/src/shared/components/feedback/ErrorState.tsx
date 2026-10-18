import { ExclamationCircleOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { useNavigate } from 'react-router'
import { useLocale } from '../../providers/useLocale'

type ErrorStateProps = {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  homePath?: string
  homeLabel?: string
  code?: string
  fullScreen?: boolean
}

export default function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  homePath,
  homeLabel,
  code,
  fullScreen = false,
}: ErrorStateProps) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const Container = fullScreen ? 'main' : 'section'

  return (
    <Container className={`feedback-screen ${fullScreen ? 'feedback-screen--full rose-ui' : ''}`} role="alert">
      {fullScreen && <div className="ambient-wash" aria-hidden="true" />}
      <section className="feedback-card error-card">
        <div className="error-visual" aria-hidden="true">
          <span className="error-visual__ring" />
          <span className="error-visual__icon"><ExclamationCircleOutlined /></span>
          {code && <span className="error-visual__code">{code}</span>}
        </div>
        <span className="feedback-eyebrow feedback-eyebrow--error">
          {code ? t('KHÔNG TÌM THẤY TRANG', 'PAGE NOT FOUND') : t('ĐÃ CÓ SỰ CỐ', 'SOMETHING WENT WRONG')}
        </span>
        <h1 className="feedback-title">{title ?? t('Không thể tải dữ liệu', 'We couldn’t load your information')}</h1>
        <p className="feedback-description">{description}</p>
        <div className="feedback-actions">
          {onRetry && (
            <Button type="primary" size="large" aria-label={retryLabel ?? t('Thử lại', 'Try again')} icon={<ReloadOutlined aria-hidden="true" />} onClick={onRetry}>
              {retryLabel ?? t('Thử lại', 'Try again')}
            </Button>
          )}
          {homePath && (
            <Button size="large" aria-label={homeLabel ?? t('Về trang chủ', 'Go to home')} icon={<HomeOutlined aria-hidden="true" />} onClick={() => navigate(homePath)}>
              {homeLabel ?? t('Về trang chủ', 'Go to home')}
            </Button>
          )}
        </div>
        <span className="error-support-note">
          {t('Nếu sự cố vẫn tiếp diễn, vui lòng thử lại sau.', 'If the problem continues, please try again later.')}
        </span>
      </section>
    </Container>
  )
}
