import { Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardBody, CardHeader, CardRow } from './card'

interface PvCardProps {
  voltage: number | null
  power: number | null
  status?: string | null
}

export function PvCard({ voltage, power, status }: PvCardProps) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader icon={<Sun className="size-4 shrink-0" aria-hidden />} title={t('pv.title')} />
      <CardBody>
        <CardRow
          label={t('pv.power')}
          value={power != null ? `${power} W` : '—'}
          primary
          valueClassName="text-warning"
        />
        <CardRow label={t('pv.voltage')} value={voltage != null ? `${voltage} V` : '—'} />
        {status && (
          <CardRow
            label={t('pv.status')}
            value={t(`data.pv.status.${status}`, { defaultValue: status })}
          />
        )}
      </CardBody>
    </Card>
  )
}
