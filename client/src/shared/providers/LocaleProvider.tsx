import { useEffect, useState, type ReactNode } from 'react'
import { LocaleContext, type Locale } from './locale-context'
import { ConfigProvider, type ThemeConfig } from 'antd'
import viVN from 'antd/locale/vi_VN'
import enUS from 'antd/locale/en_US'

const portalTheme: ThemeConfig = {
  token: {
    colorPrimary: '#193B2D', colorInfo: '#587D9E', colorSuccess: '#347653',
    colorText: '#193B2D', colorTextSecondary: '#5c6f62', colorBorder: '#E2EAE3',
    colorError: '#b94b55', colorWarning: '#94601f',
    colorBgLayout: '#F5F8F4', colorLink: '#347653', colorLinkHover: '#275f40',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14, borderRadius: 11, controlHeight: 38, controlHeightLG: 46,
  },
  components: {
    Button: { primaryShadow: 'none', fontWeight: 600, borderRadiusLG: 11 },
    Input: { activeBorderColor: '#ba6e8b', hoverBorderColor: '#d594ab', activeShadow: '0 0 0 3px rgb(243 181 199 / 25%)' },
    Select: { activeBorderColor: '#ba6e8b', hoverBorderColor: '#d594ab', optionSelectedBg: '#fbeaf0' },
    Card: { borderRadiusLG: 18, headerFontSize: 16 },
    Menu: {
      itemBg: 'transparent', itemColor: '#687B70', itemHoverColor: '#193B2D',
      horizontalItemSelectedColor: '#193B2D', horizontalItemSelectedBg: '#f9dce5',
      horizontalItemHoverBg: '#fff2f6', horizontalItemHoverColor: '#193B2D',
      activeBarHeight: 0, itemBorderRadius: 11, itemPaddingInline: 14,
    },
    Table: { headerBg: '#f8f6f4', rowHoverBg: '#fff5f8', borderColor: '#f0e5e9' },
    Tag: { borderRadiusSM: 6 },
    Pagination: { itemActiveBg: '#fbe2eb' },
    Steps: { colorPrimary: '#347653' },
  },
}

function getInitialLocale(): Locale {
  return localStorage.getItem('locale') === 'en' ? 'en' : 'vi'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale)

  useEffect(() => {
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = {
    locale,
    setLocale,
    t: (vietnamese: string, english: string) => locale === 'vi' ? vietnamese : english,
  }

  return <LocaleContext.Provider value={value}>
    <ConfigProvider locale={locale === 'vi' ? viVN : enUS} theme={portalTheme}>
      {children}
    </ConfigProvider>
  </LocaleContext.Provider>
}
