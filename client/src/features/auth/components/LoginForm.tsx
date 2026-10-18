import { TuitionSlip } from '../../../shared/components/brand/TuitionSlip'
import { PortalIcon } from '../../../shared/components/brand/PortalIcon'
import { Alert, Button, Dropdown, Input, Typography } from 'antd'
import type { MenuProps } from 'antd'
import type { FormEventHandler } from 'react'
import { useLocale } from '../../../shared/providers/useLocale'

type LoginPageProps = {
  username: string
  password: string
  busy: boolean
  error: string
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
}

export default function LoginPage({
  username,
  password,
  busy,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginPageProps) {
  const { locale, setLocale, t } = useLocale()
  const languageMenu: MenuProps['items'] = [
    { key: 'vi', label: 'Tiếng Việt', onClick: () => setLocale('vi') },
    { key: 'en', label: 'English', onClick: () => setLocale('en') },
  ]
  return (
    <main className="rose-login grid min-h-screen place-items-center overflow-hidden bg-brand-canvas bg-[radial-gradient(ellipse_at_9%_7%,rgba(221,242,227,0.78),transparent_34%),radial-gradient(ellipse_at_94%_95%,rgba(243,181,199,0.2),transparent_31%)] p-6 md:p-9 max-[520px]:p-4">
      <div className="ambient-wash" aria-hidden="true" />
      <section className="grid min-h-[620px] w-full max-w-[1000px] grid-cols-2 overflow-hidden rounded-[28px] border border-brand-line/85 bg-white shadow-[0_32px_100px_-48px_rgba(26,61,44,0.4)] max-[800px]:min-h-0 max-[800px]:max-w-[500px] max-[800px]:grid-cols-1 max-[520px]:rounded-[21px]">
        <aside className="rose-login-story relative flex min-h-[620px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#eaf8eb] via-[#e2f2e4] to-[#f2f8ef] p-[42px] max-[800px]:hidden">
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-[126px] right-[92px] z-0 size-[220px] rounded-full bg-brand-green/75" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-[262px] -right-[125px] z-0 size-[330px] rounded-full border-[42px] border-white/50" />
          <div className="relative z-[1] flex items-center gap-3 text-[15px] font-extrabold tracking-[.04em] text-brand-forest">
            <span className="grid size-[43px] flex-none place-items-center rounded-[15px] bg-white text-[19px] text-brand-forest shadow-[0_5px_15px_rgba(41,78,50,0.07)]"><PortalIcon name="brand" /></span>
            <span>{t('HỌC PHÍ SỐ', 'TUITION PORTAL')}</span>
          </div>
          <TuitionSlip className="login-tuition-slip" />
          <div className="relative z-[1] mb-[38px] mt-auto max-w-[390px]">
            <Typography.Title level={1} className="!mb-[14px] !mt-5 !text-[clamp(37px,4vw,47px)] !font-semibold !leading-[1.12] !tracking-[-.055em] !text-brand-forest">
              {t('Học phí,', 'Tuition,')}
              <br />
              <span className="editorial-title-accent text-brand-green-strong">{t('thật nhẹ nhàng.', 'made simple.')}</span>
            </Typography.Title>
            <Typography.Paragraph className="!mb-0 !max-w-[345px] !text-[15px] !leading-[1.8] !text-[#4d3942]">
              {t(
                'Tra cứu, thanh toán và theo dõi học phí.',
                'Look up, pay and track your tuition.',
              )}
            </Typography.Paragraph>
          </div>
          <div className="relative z-[1] flex items-center gap-[9px] text-xs font-semibold text-[#4d3942]">
            <PortalIcon name="shield" className="!text-[17px] !text-[#61a66e]" />
            <span>{t('Bảo mật trong từng giao dịch', 'Security in every transaction')}</span>
          </div>
        </aside>

        <section className="relative grid items-center px-[54px] py-12 max-[800px]:px-[46px] max-[800px]:py-[42px] max-[520px]:px-[23px] max-[520px]:py-[30px]">
          {/* Language switcher — top right of form panel */}
          <Dropdown
            menu={{ items: languageMenu, selectedKeys: [locale] }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-[9px] border border-brand-line bg-white px-[9px] py-[7px] text-[11px] font-bold text-brand-forest transition-colors hover:border-brand-green-strong hover:text-brand-green-strong"
              aria-label={t('Chọn ngôn ngữ', 'Select language')}
            >
              <PortalIcon name="globe" />
              <span>{locale.toUpperCase()}</span>
              <PortalIcon name="chevron" className="portal-chevron text-brand-muted" />
            </button>
          </Dropdown>

          <div className="mx-auto w-full max-w-[365px]">
            <div className="mb-[34px] hidden items-center gap-[10px] text-[#294331] max-[800px]:flex max-[520px]:mb-[29px]">
              <span className="grid size-[43px] flex-none place-items-center rounded-[15px] bg-brand-green text-[19px] text-brand-forest"><PortalIcon name="brand" /></span>
              <Typography.Text strong className="!text-brand-forest">{t('Học Phí Số', 'Tuition Portal')}</Typography.Text>
            </div>
            <Typography.Text className="!text-[10px] !font-bold !tracking-[.16em] !text-brand-green-strong">{t('CHÀO MỪNG TRỞ LẠI', 'WELCOME BACK')}</Typography.Text>
            <Typography.Title level={2} className="!my-2 !text-[30px] !font-semibold !tracking-[-.045em] !text-[#20352a]">{t('Đăng nhập', 'Sign in')}</Typography.Title>
            <Typography.Paragraph type="secondary" className="!text-[13px]">
              {t('Nhập thông tin tài khoản để tiếp tục.', 'Enter your account details to continue.')}
            </Typography.Paragraph>

            <form className="mt-[30px] grid gap-[11px]" onSubmit={onSubmit}>
              <label className="mt-1.5 text-xs font-semibold text-[#3c4d41]" htmlFor="username">{t('Tên đăng nhập', 'Username')}</label>
              <Input
                id="username"
                size="large"
                prefix={<PortalIcon name="user" />}
                placeholder={t('Tên đăng nhập', 'Username')}
                autoComplete="username"
                required
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
             />
              <label className="mt-1.5 text-xs font-semibold text-[#3c4d41]" htmlFor="password">{t('Mật khẩu', 'Password')}</label>
              <Input.Password
                id="password"
                size="large"
                prefix={<PortalIcon name="lock" />}
                placeholder={t('Nhập mật khẩu', 'Enter your password')}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
             />
              <div className="mb-1 mt-[-1px] flex items-center justify-between">
                {/* <a
                  className="text-sm font-semibold text-[#578c60] transition-colors hover:text-[#386c43]"
                  href="mailto:support@hocphiso.vn?subject=H%E1%BB%97%20tr%E1%BB%A3%20%C4%91%C4%83ng%20nh%E1%BA%ADp"
                >
                  Cần hỗ trợ?
                </a> */}
              </div>
              {error && <Alert showIcon type="error" message={error} />}
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={busy}
                icon={!busy && <PortalIcon name="arrow" />}
                iconPlacement="end"
                block
                className="!mt-2.5 !h-12 !border-0 !bg-brand-forest !font-bold !text-white hover:!bg-brand-green-strong"
              >
                {t('Đăng nhập', 'Sign in')}
              </Button>
            </form>
            <div className="mt-[31px] flex justify-center gap-2 border-t border-[#eef1ed] pt-[19px] text-[12px] text-brand-muted">
              <PortalIcon name="lock" className="!text-[#72a87a]" />
              <span>{t('Phiên đăng nhập được bảo vệ an toàn.', 'Your session is securely protected.')}</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
