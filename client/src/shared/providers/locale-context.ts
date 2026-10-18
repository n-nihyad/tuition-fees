import { createContext } from 'react'

export type Locale = 'vi' | 'en'

export type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (vietnamese: string, english: string) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
