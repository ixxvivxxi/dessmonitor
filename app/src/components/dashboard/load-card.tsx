import { Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardRow } from '../ui/card';

interface LoadCardProps {
  voltage: number | null;
  power: number | null;
  frequency: number | null;
  status?: string | null;
  sourcePriority?: string | null;
}

export function LoadCard({ voltage, power, frequency, status, sourcePriority }: LoadCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader icon={<Plug className="size-4 shrink-0" aria-hidden />} title={t('load.title')} />
      <CardBody>
        <CardRow label={t('load.power')} value={power != null ? `${power} W` : '—'} primary />
        <CardRow label={t('load.voltage')} value={voltage != null ? `${voltage} V` : '—'} />
        <CardRow label={t('load.frequency')} value={frequency != null ? `${frequency} Hz` : '—'} />
        {status && (
          <CardRow
            label={t('load.status')}
            value={t(`data.load.status.${status}`, { defaultValue: status })}
          />
        )}
        {sourcePriority && (
          <CardRow
            label={t('load.sourcePriority')}
            value={t(`data.load.sourcePriority.${sourcePriority}`, {
              defaultValue: sourcePriority,
            })}
          />
        )}
      </CardBody>
    </Card>
  );
}
