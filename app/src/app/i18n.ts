import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en, ru } from './translation'

const LOCALE_KEY = 'dessmonitor_locale'

function loadLocale(): string {
  try {
    const s = localStorage.getItem(LOCALE_KEY)
    if (s === 'en' || s === 'ru') return s
  } catch {
    /* ignore */
  }
  return 'en'
}

const resources = { en, ru }

i18n.use(initReactI18next).init({
  resources,
  lng: loadLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(LOCALE_KEY, lng)
  } catch {
    /* ignore */
  }
})

export default i18n
