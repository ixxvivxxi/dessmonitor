import { useTranslation } from 'react-i18next';
import { BatteryVoltageCard } from '../components/statistics/battery-voltage-card';
import { WattsTotalCard } from '../components/statistics/watts-total-card';
import { Typography } from '../components/ui/typography';
import { useBatteryVoltageChart } from '../hooks/use-battery-voltage-chart';
import { useDessDevice } from '../hooks/use-dess-device';
import { useDevices } from '../hooks/use-devices.ts';
import { useWattsTotalChart } from '../hooks/use-watts-total-chart';

export function StatisticsPage() {
  const { t } = useTranslation();
  const { selected } = useDevices();
  const { battery } = useDessDevice({ pn: selected?.pn, enabled: true });
  const { loading, error, refetch, voltages } = useBatteryVoltageChart(selected?.pn);
  const {
    loading: wattsLoading,
    error: wattsError,
    refetch: wattsRefetch,
    generatedWh,
    consumedWh,
  } = useWattsTotalChart(selected?.pn);

  const voltageStr = battery.voltage != null ? ` (${battery.voltage.toFixed(2)} V)` : '';

  return (
    <div>
      <Typography variant="h1" className="mb-6">
        {t('statistics.title')}
        {voltageStr}
      </Typography>
      {(loading || wattsLoading) && (
        <Typography variant="caption" className="mb-4">
          {t('app.loadingInverterData')}
        </Typography>
      )}
      {error && (
        <div role="alert" className="alert alert-error mb-4">
          <span>{error}</span>
          <button type="button" onClick={refetch} className="btn btn-ghost btn-sm">
            {t('app.retry')}
          </button>
        </div>
      )}
      {wattsError && (
        <div role="alert" className="alert alert-error mb-4">
          <span>{wattsError}</span>
          <button type="button" onClick={wattsRefetch} className="btn btn-ghost btn-sm">
            {t('app.retry')}
          </button>
        </div>
      )}
      <div className="grid gap-4 grid-cols-2 mb-6">
        <WattsTotalCard type="generated" wh={generatedWh} />
        <WattsTotalCard type="consumed" wh={consumedWh} />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <BatteryVoltageCard
          title={t('statistics.last1h')}
          voltage={voltages.hour1}
          current={battery.voltage}
        />
        <BatteryVoltageCard
          title={t('statistics.last6h')}
          voltage={voltages.hour6}
          current={battery.voltage}
        />
        <BatteryVoltageCard
          title={t('statistics.last12h')}
          voltage={voltages.hour12}
          current={battery.voltage}
        />
        <BatteryVoltageCard
          title={t('statistics.last24h')}
          voltage={voltages.hour24}
          current={battery.voltage}
        />
      </div>
    </div>
  );
}
