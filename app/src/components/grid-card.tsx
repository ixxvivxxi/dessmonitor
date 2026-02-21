import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface GridCardProps {
  voltage: number | null
  frequency: number | null
  status?: string | null
  inputRange?: string | null
}

export function GridCard({ voltage, frequency, status, inputRange }: GridCardProps) {
  const { t } = useTranslation()
  return (
    <div className="card card-border bg-base-100 p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-medium text-base-content/70">
        <Zap className="size-4 shrink-0" aria-hidden />
        {t('grid.title')}
      </h2>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-base-content/80">{t('grid.voltage')}</span>
          <span className="tabular-nums font-medium text-base-content">
            {voltage != null ? `${voltage} V` : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-base-content/80">{t('grid.frequency')}</span>
          <span className="tabular-nums font-medium text-base-content">
            {frequency != null ? `${frequency} Hz` : '—'}
          </span>
        </div>
        {status && (
          <div className="flex justify-between text-sm">
            <span className="text-base-content/80">{t('grid.status')}</span>
            <span className="text-base-content">{status}</span>
          </div>
        )}
        {inputRange && (
          <div className="flex justify-between text-sm">
            <span className="text-base-content/80">{t('grid.inputRange')}</span>
            <span className="text-base-content">{inputRange}</span>
          </div>
        )}
      </div>
    </div>
  )
}
