import { useTranslation } from 'react-i18next';
import type { Device } from '../../hooks/use-devices.ts';
import { useDevices } from '../../hooks/use-devices.ts';
import { Typography } from '../ui/typography';

export function DeviceChooser() {
  const { t } = useTranslation();
  const { devices, selected, loading, error, fetchDevices, selectDevice } = useDevices();

  const label = (d: Device) => d.devalias || d.sn || d.pn;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Typography variant="h3">{t('settings.device')}</Typography>
        <button
          type="button"
          onClick={() => void fetchDevices()}
          disabled={loading}
          className="btn btn-ghost btn-xs"
        >
          {loading ? t('settings.loading') : t('settings.refresh')}
        </button>
      </div>
      {error && <Typography variant="error">{error}</Typography>}
      {devices.length === 0 && !loading && (
        <Typography variant="caption">{t('settings.noDevices')}</Typography>
      )}
      {devices.length > 0 && (
        <select
          value={selected ? `${selected.pn}:${selected.sn}` : ''}
          onChange={(e) => {
            const val = e.target.value;
            const d = devices.find((x) => `${x.pn}:${x.sn}` === val);
            if (d) void selectDevice(d);
          }}
          className="select select-bordered select-sm w-full max-w-xs"
        >
          <option value="">{t('settings.selectDevice')}</option>
          {devices.map((d) => (
            <option key={`${d.pn}:${d.sn}`} value={`${d.pn}:${d.sn}`}>
              {label(d)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
