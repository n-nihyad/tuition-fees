import { PortalIcon } from '../brand/PortalIcon'
import { Avatar, Dropdown, Grid, Menu, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { NavLink, useLocation } from 'react-router'
import type { Wallet } from '../../types/models'
import { money } from '../../utils/formatters'
import { useLocale } from '../../providers/useLocale'

type UserPortalHeaderProps = {
  fullName: string | undefined
  email: string | undefined
  wallet: Wallet | null
  onSignOut: () => void
}

export default function UserPortalHeader({
  fullName,
  email,
  wallet,
  onSignOut,
}: UserPortalHeaderProps) {
  const { locale, setLocale, t } = useLocale()
  const { pathname } = useLocation()
  const screens = Grid.useBreakpoint()
  const profileMenu: MenuProps['items'] = [
    {
      key: 'email',
      label: email ?? t('Đang tải hồ sơ…', 'Loading profile…'),
      icon: <PortalIcon name="mail" />,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: t('Đăng xuất', 'Sign out'),
      icon: <PortalIcon name="logout" />,
      danger: true,
      onClick: onSignOut,
    },
  ]
  const languageMenu: MenuProps['items'] = [
    { key: 'vi', label: 'Tiếng Việt', onClick: () => setLocale('vi') },
    { key: 'en', label: 'English', onClick: () => setLocale('en') },
  ]

  return (
    <header className="rose-nav sticky top-3 z-20 mx-auto w-[min(1360px,calc(100%-32px))] rounded-2xl border border-brand-line bg-white/[0.7] backdrop-blur-sm max-[520px]:top-2 max-[520px]:w-[calc(100%-20px)]">
      <div className="portal-header-inner mx-auto flex min-h-[76px] w-[calc(100%-40px)] items-center gap-1 max-[1100px]:min-h-0 max-[1100px]:w-[calc(100%-28px)] max-[1100px]:flex-wrap max-[1100px]:pt-2 max-[520px]:w-[calc(100%-20px)] max-[520px]:min-h-[64px] max-[520px]:pt-1.5">
        {/* Logo */}
        <NavLink className="flex flex-none items-center gap-[10px] text-brand-forest no-underline max-[520px]:gap-[7px]" to="/dashboard" aria-label="Học Phí Số">
          <span className="rose-brand-mark grid size-[42px] flex-none place-items-center rounded-[13px] bg-brand-green text-brand-forest max-[520px]:size-[36px]"><PortalIcon name="brand" /></span>
          <span>
            <strong className="block text-base font-bold leading-snug max-[520px]:text-sm">Học Phí Số</strong>
            <small className="block text-[11px] font-normal tracking-[.08em] text-brand-muted max-[520px]:text-[10px]">{t('CỔNG SINH VIÊN', 'STUDENT PORTAL')}</small>
          </span>
        </NavLink>

        {/* Nav */}
        <nav className="ml-6 min-w-0 flex-1 flex items-center gap-0.5 max-[1100px]:order-3 max-[1100px]:ml-0 max-[1100px]:h-12 max-[1100px]:w-full max-[1100px]:overflow-x-auto max-[520px]:h-11" aria-label={t('Điều hướng chính', 'Main navigation')}>
          {!screens.xl ? <div className="portal-mobile-nav">
            <NavLink to="/dashboard" end><PortalIcon name="home" />{t('Tổng quan', 'Overview')}</NavLink>
            <NavLink to="/payment"><PortalIcon name="payment" />{t('Thanh toán', 'Pay')}</NavLink>
            <NavLink to="/history"><PortalIcon name="history" />{t('Lịch sử', 'History')}</NavLink>
          </div> : <Menu className="portal-menu" mode="horizontal" selectedKeys={[pathname]} items={[
            { key: '/dashboard', icon: <PortalIcon name="home" />, label: <NavLink to="/dashboard" end>{t('Tổng quan', 'Dashboard')}</NavLink> },
            { key: '/payment', icon: <PortalIcon name="payment" />, label: <NavLink to="/payment">{t('Thanh toán học phí', 'Tuition payment')}</NavLink> },
            { key: '/history', icon: <PortalIcon name="history" />, label: <NavLink to="/history">{t('Lịch sử giao dịch', 'Transaction history')}</NavLink> },
          ]} />}
        </nav>

        {/* Right side */}
        <div className="portal-header-actions ml-auto flex items-center gap-2 max-[1100px]:order-1 max-[1100px]:ml-auto">
          {/* Wallet balance */}
          <div className="rose-wallet-chip grid whitespace-nowrap rounded-[10px] border border-brand-green/30 bg-brand-green/10 px-3 py-[6px] max-[520px]:px-2 max-[520px]:py-1" aria-label={t('Số dư khả dụng', 'Available balance')}>
            <span className="text-[11px] font-normal leading-snug text-brand-muted max-[520px]:hidden">{t('Số dư khả dụng', 'Available balance')}</span>
            <Typography.Text strong className="!text-[14px] !leading-snug !text-brand-forest max-[520px]:!text-[12px]">{wallet ? money(wallet.availableBalance, locale) : '—'}</Typography.Text>
          </div>

          {/* Language picker */}
          <Dropdown
            menu={{ items: languageMenu, selectedKeys: [locale] }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              className="portal-language inline-flex items-center gap-1.5 rounded-[9px] border border-brand-line bg-white px-[9px] py-[7px] text-[12px] font-medium text-brand-forest transition-colors hover:border-brand-green-strong hover:text-brand-green-strong max-[520px]:gap-1 max-[520px]:p-1.5"
              aria-label={t('Chọn ngôn ngữ', 'Select language')}
            >
              <PortalIcon name="globe" />
              <span>{locale.toUpperCase()}</span>
              <PortalIcon name="chevron" className="portal-chevron text-brand-muted max-[520px]:hidden" />
            </button>
          </Dropdown>

          {/* Profile dropdown */}
          <Dropdown menu={{ items: profileMenu }} trigger={['click']} placement="bottomRight">
            <button type="button" className="portal-profile flex items-center gap-2 rounded-xl border-0 bg-transparent p-1.5 text-left transition-colors hover:bg-brand-canvas" aria-label={t('Tài khoản', 'Account')}>
              <Avatar className="!bg-brand-green/30 !font-bold !text-brand-forest" icon={<PortalIcon name="user" />}>
                {fullName?.charAt(0)}
              </Avatar>
              <span className="grid gap-[3px] max-[1200px]:hidden">
                <strong className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold leading-snug text-brand-forest">{fullName ?? t('Đang tải…', 'Loading…')}</strong>
                <small className="text-[11px] font-normal leading-snug text-brand-muted">{t('Người nộp học phí', 'Payer')}</small>
              </span>
              <PortalIcon name="chevron" className="portal-chevron text-brand-muted max-[520px]:hidden" />
            </button>
          </Dropdown>
        </div>
      </div>
    </header>
  )
}
