import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardRow } from '../ui/card';

interface GridCardProps {
  voltage: number | null;
  frequency: number | null;
  status?: string | null;
  inputRange?: string | null;
}

export function GridCard({ voltage, frequency, status, inputRange }: GridCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader icon={<Zap className="size-4 shrink-0" aria-hidden />} title={t('grid.title')} />
      <CardBody>
        <CardRow label={t('grid.voltage')} value={voltage != null ? `${voltage} V` : '—'} />
        <CardRow label={t('grid.frequency')} value={frequency != null ? `${frequency} Hz` : '—'} />
        {status && (
          <CardRow
            label={t('grid.status')}
            value={t(`data.grid.status.${status}`, { defaultValue: status })}
          />
        )}
        {inputRange && (
          <CardRow
            label={t('grid.inputRange')}
            value={t(`data.grid.inputRange.${inputRange}`, { defaultValue: inputRange })}
          />
        )}
      </CardBody>
    </Card>
  );
}
