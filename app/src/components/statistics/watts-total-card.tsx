import { Sun, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Typography } from '../ui/typography';

interface WattsTotalCardProps {
  /** "Generated" or "Consumed" */
  type: 'generated' | 'consumed';
  /** Energy in Wh (watt-hours) */
  wh: number | null;
}

function formatWh(wh: number): string {
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(1)} kWh`;
  }
  return `${Math.round(wh)} Wh`;
}

export function WattsTotalCard({ type, wh }: WattsTotalCardProps) {
  const { t } = useTranslation();
  const titleKey = type === 'generated' ? 'statistics.generated24h' : 'statistics.consumed24h';
  const Icon = type === 'generated' ? Sun : Zap;

  return (
    <div className="card card-border bg-base-100 p-4 shadow-sm justify-between">
      <Typography variant="cardTitle" className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" aria-hidden />
        {t(titleKey)}
      </Typography>
      {wh != null ? (
        <Typography variant="value" className="text-base">
          {formatWh(wh)}
        </Typography>
      ) : (
        <Typography variant="captionDim">{t('statistics.noData')}</Typography>
      )}
    </div>
  );
}
