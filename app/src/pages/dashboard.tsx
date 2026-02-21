import { useTranslation } from 'react-i18next';
import { InverterDashboard } from '../components/dashboard/inverter-dashboard';
import { Typography } from '../components/ui/typography';
import { useDessDevice } from '../hooks/use-dess-device.ts';
import { useDevices } from '../hooks/use-devices.ts';

export function DashboardPage() {
  const { t } = useTranslation();
  const { selected } = useDevices();
  const {
    loading: deviceLoading,
    error: deviceError,
    refetch,
    grid,
    pv,
    battery,
    load,
    system,
  } = useDessDevice({
    pn: selected?.pn,
    pollIntervalMs: 30_000,
    enabled: true,
  });

  const deviceData = { grid, pv, battery, load, system };

  return (
    <div>
      {deviceLoading && (
        <Typography variant="caption" className="mb-4">
          {t('app.loadingInverterData')}
        </Typography>
      )}
      {deviceError && (
        <div role="alert" className="alert alert-error mb-4">
          <span>{deviceError}</span>
          <button type="button" onClick={refetch} className="btn btn-ghost btn-sm">
            {t('app.retry')}
          </button>
        </div>
      )}
      <InverterDashboard data={deviceData} />
    </div>
  );
}
