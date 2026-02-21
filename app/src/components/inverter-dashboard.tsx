import { useTranslation } from 'react-i18next'
import { BatteryStatus } from './battery-status.tsx'
import { GridCard } from './grid-card.tsx'
import { LoadCard } from './load-card.tsx'
import { PvCard } from './pv-card.tsx'
import type { DeviceData } from '../hooks/use-dess-device.ts'

interface InverterDashboardProps {
  data: DeviceData
}

export function InverterDashboard({ data }: InverterDashboardProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <div className="card card-border bg-base-100 p-3 shadow-sm">
        <p className="text-sm text-base-content/70">
          {t('dashboard.workingState')}:{' '}
          <span className="font-medium text-base-content">
            {data.system.workingState ?? '—'}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PvCard
          voltage={data.pv.voltage}
          power={data.pv.power}
          status={data.pv.status}
        />
        <BatteryStatus
          voltage={data.battery.voltage ?? undefined}
          capacity={data.battery.capacity ?? undefined}
          charging={data.battery.charging}
        />
        <GridCard
          voltage={data.grid.voltage}
          frequency={data.grid.frequency}
          status={data.grid.status}
          inputRange={data.grid.inputRange}
        />
        <LoadCard
          voltage={data.load.voltage}
          power={data.load.power}
          frequency={data.load.frequency}
          status={data.load.status}
          sourcePriority={data.load.sourcePriority}
        />
      </div>

      {(data.battery.chargingCurrent != null || data.battery.dischargeCurrent != null) && (
        <div className="card card-border bg-base-100 p-4 shadow-sm">
          <h3 className="text-sm font-medium text-base-content/70">
            {t('dashboard.batteryCurrents')}
          </h3>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            {data.battery.chargingCurrent != null && (
              <span>
                {t('dashboard.charging')}:{' '}
                <span className="tabular-nums font-medium text-success">
                  {data.battery.chargingCurrent} A
                </span>
              </span>
            )}
            {data.battery.dischargeCurrent != null && (
              <span>
                {t('dashboard.discharge')}:{' '}
                <span className="tabular-nums font-medium text-warning">
                  {data.battery.dischargeCurrent} A
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
