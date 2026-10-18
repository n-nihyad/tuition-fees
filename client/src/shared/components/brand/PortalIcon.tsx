import {
  AppstoreOutlined, ArrowRightOutlined, BankOutlined, CreditCardOutlined,
  DownOutlined, GlobalOutlined, HistoryOutlined, LockOutlined,
  LogoutOutlined, MailOutlined, SafetyCertificateOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons'

type IconName = 'brand' | 'home' | 'payment' | 'history' | 'globe' | 'logout' | 'mail' | 'user' | 'arrow' | 'lock' | 'search' | 'shield' | 'chevron'

const icons = {
  brand: BankOutlined,
  home: AppstoreOutlined,
  payment: CreditCardOutlined,
  history: HistoryOutlined,
  globe: GlobalOutlined,
  logout: LogoutOutlined,
  mail: MailOutlined,
  user: UserOutlined,
  arrow: ArrowRightOutlined,
  lock: LockOutlined,
  search: SearchOutlined,
  shield: SafetyCertificateOutlined,
  chevron: DownOutlined,
}

export function PortalIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const Icon = icons[name]
  return <Icon className={`portal-icon ${className}`} aria-hidden="true" />
}
