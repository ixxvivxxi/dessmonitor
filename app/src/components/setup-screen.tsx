import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppLayout } from './app-layout.tsx'
import { useDessAuth } from '../hooks/use-dess-auth.ts'

export function SetupScreen() {
  const { t } = useTranslation()
  const {
    loading: authLoading,
    error: authError,
    saveCredentials,
    clearError,
  } = useDessAuth()
  const [urlInput, setUrlInput] = useState('')

  const handleSave = async () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    await saveCredentials(trimmed)
    setUrlInput('')
  }

  return (
    <AppLayout minimal>
      <div className="flex flex-1 flex-col items-center justify-center py-8">
        <div className="card card-border w-full max-w-md bg-base-100 shadow-sm sm:max-w-lg">
          <div className="card-body p-6">
            {authError && (
              <div className="alert alert-error mb-4" role="alert">
                <span>{authError}</span>
                <button
                  type="button"
                  onClick={clearError}
                  className="btn btn-ghost btn-sm"
                >
                  {t('app.dismiss')}
                </button>
              </div>
            )}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">{t('app.pasteUrlHint')}</legend>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t('app.urlPlaceholder')}
                rows={4}
                className="textarea textarea-bordered textarea-sm w-full font-mono"
              />
              <button
                type="button"
                disabled={authLoading || !urlInput.trim()}
                onClick={handleSave}
                className="btn btn-primary btn-sm mt-3"
              >
                {authLoading && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                {authLoading ? t('app.saving') : t('app.saveCredentials')}
              </button>
            </fieldset>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
