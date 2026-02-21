import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const LOCALE_KEY = 'dessmonitor_locale'

function loadLocale(): string {
  try {
    const s = localStorage.getItem(LOCALE_KEY)
    if (s === 'en' || s === 'ru') return s
  } catch {
    /* ignore */
  }
  return 'en'
}

const resources = {
  en: {
    translation: {
      nav: {
        dashboard: 'Dashboard',
        settings: 'Settings',
      },
      app: {
        title: 'Dessmonitor',
        pasteUrlHint:
          'Paste the dessmonitor URL from your browser DevTools (Network tab, filter by querySPDeviceLastData or queryDeviceParsEs).',
        dismiss: 'Dismiss',
        saveCredentials: 'Save credentials',
        saving: 'Saving…',
        resetCredentials: 'Reset credentials',
        loadingInverterData: 'Loading inverter data…',
        retry: 'Retry',
        urlPlaceholder:
          'https://web.dessmonitor.com/public/?sign=...&salt=...&token=...',
      },
      dashboard: {
        workingState: 'Working state',
        batteryCurrents: 'Battery currents',
        charging: 'Charging',
        discharge: 'Discharge',
      },
      grid: {
        title: 'Grid',
        voltage: 'Voltage',
        frequency: 'Frequency',
        status: 'Status',
        inputRange: 'Input range',
      },
      pv: {
        title: 'Solar (PV)',
        power: 'Power',
        voltage: 'Voltage',
        status: 'Status',
      },
      battery: {
        title: 'Battery',
        charging: 'Charging',
        voltage: 'Voltage',
        na: 'N/A',
      },
      load: {
        title: 'Load (AC output)',
        power: 'Power',
        voltage: 'Voltage',
        frequency: 'Frequency',
        status: 'Status',
        sourcePriority: 'Source priority',
      },
    },
  },
  ru: {
    translation: {
      nav: {
        dashboard: 'Панель',
        settings: 'Настройки',
      },
      app: {
        title: 'Dessmonitor',
        pasteUrlHint:
          'Вставьте URL dessmonitor из DevTools браузера (вкладка Network, фильтр querySPDeviceLastData или queryDeviceParsEs).',
        dismiss: 'Закрыть',
        saveCredentials: 'Сохранить учётные данные',
        saving: 'Сохранение…',
        resetCredentials: 'Сбросить учётные данные',
        loadingInverterData: 'Загрузка данных инвертора…',
        retry: 'Повторить',
        urlPlaceholder:
          'https://web.dessmonitor.com/public/?sign=...&salt=...&token=...',
      },
      dashboard: {
        workingState: 'Режим работы',
        batteryCurrents: 'Токи батареи',
        charging: 'Зарядка',
        discharge: 'Разряд',
      },
      grid: {
        title: 'Сеть',
        voltage: 'Напряжение',
        frequency: 'Частота',
        status: 'Статус',
        inputRange: 'Диапазон входа',
      },
      pv: {
        title: 'Солнце (PV)',
        power: 'Мощность',
        voltage: 'Напряжение',
        status: 'Статус',
      },
      battery: {
        title: 'Батарея',
        charging: 'Зарядка',
        voltage: 'Напряжение',
        na: '—',
      },
      load: {
        title: 'Нагрузка (AC)',
        power: 'Мощность',
        voltage: 'Напряжение',
        frequency: 'Частота',
        status: 'Статус',
        sourcePriority: 'Приоритет источника',
      },
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: loadLocale(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(LOCALE_KEY, lng)
  } catch {
    /* ignore */
  }
})

export default i18n
