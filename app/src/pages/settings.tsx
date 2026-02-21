import { useTranslation } from 'react-i18next'
import { useDessAuth } from '../hooks/use-dess-auth.ts'
import { LanguageChooser } from '../components/language-chooser.tsx'

export function SettingsPage() {
  const { t } = useTranslation()
  const { logout } = useDessAuth()

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-base-content">{t('nav.settings')}</h2>

      <section className="card card-border bg-base-100 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-medium text-base-content">Language</h3>
        <LanguageChooser />
      </section>

      <section className="card card-border bg-base-100 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-medium text-base-content">Credentials</h3>
        <p className="mb-4 text-sm text-base-content/80">
          Reset your dessmonitor credentials. You will need to paste the URL again
          after resetting.
        </p>
        <button type="button" onClick={() => void logout()} className="btn btn-error btn-sm">
          {t('app.resetCredentials')}
        </button>
      </section>
    </div>
  )
}
