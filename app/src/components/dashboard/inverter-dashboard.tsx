import { useTranslation } from 'react-i18next';
import type { DeviceData } from '../../hooks/use-dess-device';
import { BatteryStatus } from './battery-status';
import { GridCard } from './grid-card';
import { LoadCard } from './load-card';
import { PvCard } from './pv-card';

interface InverterDashboardProps {
  data: DeviceData;
}

export function InverterDashboard({ data }: InverterDashboardProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="card card-border bg-base-100 p-3 shadow-sm">
        <p className="text-sm text-base-content/70">
          {t('dashboard.workingState')}:{' '}
          <span className="font-medium text-base-content">
            {data.system.workingState
              ? t(`data.system.workingState.${data.system.workingState}`, {
                  defaultValue: data.system.workingState,
                })
              : '—'}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PvCard voltage={data.pv.voltage} power={data.pv.power} status={data.pv.status} />
        <BatteryStatus
          voltage={data.battery.voltage ?? undefined}
          capacity={data.battery.capacity ?? undefined}
          charging={data.battery.charging}
          chargingCurrent={data.battery.chargingCurrent}
          dischargeCurrent={data.battery.dischargeCurrent}
        />
        <LoadCard
          voltage={data.load.voltage}
          power={data.load.power}
          frequency={data.load.frequency}
          status={data.load.status}
          sourcePriority={data.load.sourcePriority}
        />
        <GridCard
          voltage={data.grid.voltage}
          frequency={data.grid.frequency}
          status={data.grid.status}
          inputRange={data.grid.inputRange}
        />
      </div>
    </div>
  );
}
