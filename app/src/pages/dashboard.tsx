import { useTranslation } from 'react-i18next';
import { InverterDashboard } from '../components/dashboard/inverter-dashboard';
import { useDessDevice } from '../hooks/use-dess-device.ts';

export function DashboardPage() {
  const { t } = useTranslation();
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
    pollIntervalMs: 30_000,
    enabled: true,
  });

  const deviceData = { grid, pv, battery, load, system };

  return (
    <div>
      {deviceLoading && (
        <p className="mb-4 text-sm text-base-content/70">{t('app.loadingInverterData')}</p>
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
