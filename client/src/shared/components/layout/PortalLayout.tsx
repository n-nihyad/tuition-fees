import { PortalIcon } from '../brand/PortalIcon'
import { Alert } from 'antd'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import type { Wallet } from '../../types/models'
import { useLocale } from '../../providers/useLocale'
import UserPortalHeader from './UserPortalHeader'

type PortalLayoutProps = {
  fullName: string | undefined
  email: string | undefined
  wallet: Wallet | null
  error: string
  notice: string
  onSignOut: () => void
  onClearFeedback: () => void
  children: ReactNode
}

export default function PortalLayout({
  fullName,
  email,
  wallet,
  error,
  notice,
  onSignOut,
  onClearFeedback,
  children,
}: PortalLayoutProps) {
  const { t } = useLocale()
  const { pathname } = useLocation()
  const content = useRef<HTMLElement>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      content.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname])
  return (
    <div className="edge-ui rose-ui min-h-screen">
      <div className="ambient-wash" aria-hidden="true" />
      <a className="skip-link" href="#portal-content">{t('Đến nội dung chính', 'Skip to main content')}</a>
      <UserPortalHeader fullName={fullName} email={email} wallet={wallet} onSignOut={onSignOut} />
      <div className="portal-main">
        {(error || notice) && (
          <div className="mb-[17px]" role={error ? 'alert' : 'status'}>
            <Alert
              showIcon
              type={error ? 'error' : 'success'}
              message={error || notice}
              closable
              onClose={onClearFeedback}
           />
          </div>
        )}
        <main ref={content} id="portal-content" tabIndex={-1} key={pathname} className="portal-content" aria-label={t('Nội dung chính', 'Main content')}>{children}</main>
        <footer className="flex justify-between gap-3 px-0.5 pb-[25px] pt-[19px] text-[9px] text-brand-muted max-[520px]:flex-col">
          <span>© 2026 {t('Học Phí Số', 'Tuition Portal')}</span>
          <span className="inline-flex items-center gap-1.5"><PortalIcon name="shield" className="!text-brand-green-strong" /> {t('Thanh toán qua OTP', 'OTP verified payments')}</span>
        </footer>
      </div>
    </div>
  )
}
