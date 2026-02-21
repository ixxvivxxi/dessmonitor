import { ArrowDown, ArrowUp, Battery } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Typography } from '../ui/typography';

interface BatteryVoltageCardProps {
  /** Label, e.g. "Last 1 hour" */
  title: string;
  /** Voltage to display (e.g. min/max from period) */
  voltage: number | null;
  /** Current voltage for diff display */
  current: number | null;
}

function DiffFromCurrent({ value, current }: { value: number; current: number }) {
  const diff = value - current;
  if (Math.abs(diff) < 0.001) return null;
  const rose = diff < 0;

  return (
    <Typography
      variant="xs"
      as="span"
      className={`ml-1 inline-flex items-center gap-0.5 ${rose ? 'text-success' : 'text-error'}`}
      title={diff < 0 ? 'Rose since then' : 'Dropped since then'}
    >
      {rose ? (
        <ArrowUp className="size-4" aria-hidden />
      ) : (
        <ArrowDown className="size-4" aria-hidden />
      )}
      <span>
        {diff > 0 ? '+' : ''}
        {diff.toFixed(2)}V
      </span>
    </Typography>
  );
}

export function BatteryVoltageCard({ title, voltage, current }: BatteryVoltageCardProps) {
  const { t } = useTranslation();

  return (
    <div className="card card-border bg-base-100 p-4 shadow-sm justify-between">
      <Typography variant="cardTitle" className="flex items-center gap-2">
        <Battery className="size-4 shrink-0" aria-hidden />
        {title}
      </Typography>
      {voltage != null ? (
        <div className="flex items-center justify-between gap-2">
          <Typography variant="value">{voltage.toFixed(2)}V</Typography>
          {current != null && <DiffFromCurrent value={voltage} current={current} />}
        </div>
      ) : (
        <Typography variant="captionDim">{t('statistics.noData')}</Typography>
      )}
    </div>
  );
}
