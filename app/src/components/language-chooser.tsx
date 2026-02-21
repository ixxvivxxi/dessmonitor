import { useTranslation } from 'react-i18next'

const LOCALES = ['en', 'ru'] as const
const LOCALE_LABELS: Record<(typeof LOCALES)[number], string> = {
  en: 'EN',
  ru: 'RU',
}

export function LanguageChooser() {
  const { i18n } = useTranslation()
  const current = (i18n.language.startsWith('en') ? 'en' : 'ru') as (typeof LOCALES)[number]
  const next = current === 'en' ? 'ru' : 'en'

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(next)}
      className="btn btn-ghost btn-sm"
    >
      {LOCALE_LABELS[current]}
    </button>
  )
}
