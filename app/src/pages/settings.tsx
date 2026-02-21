import { useTranslation } from 'react-i18next';
import { DeviceChooser } from '../components/settings/device-chooser.tsx';
import { Typography } from '../components/ui/typography';

export function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <Typography variant="h2">{t('nav.settings')}</Typography>

      <section className="card card-border bg-base-100 p-6 shadow-sm">
        <DeviceChooser />
      </section>
    </div>
  );
}
