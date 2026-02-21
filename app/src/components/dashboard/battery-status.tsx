import { Battery } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Voltage (V) → percentage lookup table (16S Lifepo4 pack), 5% steps. */
const VOLTAGE_TO_PERCENT: readonly { v: number; pct: number }[] = [
  { v: 40, pct: 0 },
  { v: 44, pct: 5 },
  { v: 48, pct: 10 },
  { v: 49.6, pct: 15 },
  { v: 51.2, pct: 20 },
  { v: 51.36, pct: 25 },
  { v: 51.52, pct: 30 },
  { v: 51.76, pct: 35 },
  { v: 52, pct: 40 },
  { v: 52.08, pct: 45 },
  { v: 52.16, pct: 50 },
  { v: 52.24, pct: 55 },
  { v: 52.32, pct: 60 },
  { v: 52.56, pct: 65 },
  { v: 52.8, pct: 70 },
  { v: 52.96, pct: 75 },
  { v: 53.12, pct: 80 },
  { v: 53.36, pct: 85 },
  { v: 53.6, pct: 90 },
  { v: 56, pct: 95 },
  { v: 58, pct: 100 },
];

function voltageToPercent(voltage: number): number {
  if (voltage <= VOLTAGE_TO_PERCENT[0].v) return 0;
  if (voltage >= VOLTAGE_TO_PERCENT[VOLTAGE_TO_PERCENT.length - 1].v) return 100;
  for (let i = 0; i < VOLTAGE_TO_PERCENT.length - 1; i++) {
    const lo = VOLTAGE_TO_PERCENT[i];
    const hi = VOLTAGE_TO_PERCENT[i + 1];
    if (voltage >= lo.v && voltage <= hi.v) {
      const t = (voltage - lo.v) / (hi.v - lo.v);
      return Math.round(lo.pct + t * (hi.pct - lo.pct));
    }
  }
  return 0;
}

interface BatteryStatusProps {
  /** Whether battery is charging. */
  charging?: boolean;
  /** Voltage in volts (e.g. 52.8). Used to compute percentage via lookup table when capacity is not provided. */
  voltage?: number;
  /** Battery SOC % from API (e.g. bt_battery_capacity). Takes precedence over voltage-derived value. */
  capacity?: number;
  /** Charging current in A. */
  chargingCurrent?: number | null;
  /** Discharge current in A. */
  dischargeCurrent?: number | null;
}

function getProgressColor(pct: number): string {
  if (pct <= 10) return 'progress-error';
  if (pct <= 30) return 'progress-warning';
  if (pct <= 60) return 'progress-info';
  return 'progress-success';
}

function getCardBg(pct: number): string {
  if (pct <= 10) return 'bg-error/10';
  if (pct <= 30) return 'bg-warning/10';
  if (pct <= 60) return 'bg-info/10';
  return 'bg-success/10';
}

export function BatteryStatus({
  charging,
  voltage,
  capacity,
  chargingCurrent,
  dischargeCurrent,
}: BatteryStatusProps) {
  const { t } = useTranslation();
  const pct =
    capacity != null
      ? Math.round(capacity)
      : voltage != null
        ? voltageToPercent(voltage)
        : undefined;
  const volts = voltage != null ? voltage.toFixed(2) : null;
  const fill = pct ?? 0;
  const progressColor = getProgressColor(fill);
  const cardBg = pct != null ? getCardBg(pct) : '';

  return (
    <div className={`card card-border bg-base-100 p-4 shadow-sm ${cardBg}`}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-base-content/70">
        <Battery className="size-4 shrink-0" aria-hidden />
        {t('battery.title')}
      </h2>
      <div className="mt-2 flex items-baseline gap-4">
        <span className="text-2xl font-semibold tabular-nums text-base-content">
          {pct != null ? `${pct}%` : '—'}
        </span>
        {charging && <span className="badge badge-success badge-sm">{t('battery.charging')}</span>}
      </div>
      {pct != null && (
        <progress
          className={`progress h-2 ${progressColor}`}
          value={fill}
          max={100}
          aria-label={t('battery.title')}
        />
      )}
      <div className="mt-2 text-sm text-base-content/80">
        <span className="font-medium">{t('battery.voltage')}:</span>{' '}
        <span className="tabular-nums">{volts != null ? `${volts} V` : t('battery.na')}</span>
      </div>
      {(chargingCurrent != null || dischargeCurrent != null) && (
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          {chargingCurrent != null && (
            <span>
              {t('dashboard.charging')}:{' '}
              <span className="tabular-nums font-medium text-success">{chargingCurrent} A</span>
            </span>
          )}
          {dischargeCurrent != null && (
            <span>
              {t('dashboard.discharge')}:{' '}
              <span className="tabular-nums font-medium text-warning">{dischargeCurrent} A</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
