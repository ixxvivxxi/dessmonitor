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
      data: {
        grid: {
          status: {
            normal: 'Normal',
            fault: 'Fault',
            'Mains OK': 'Mains OK',
          },
          inputRange: {
            APL: 'APL (90–280 V)',
            UPS: 'UPS (170–280 V)',
          },
        },
        pv: {
          status: {
            normal: 'Normal',
            fault: 'Fault',
            'PV Undervoltage': 'PV Undervoltage',
          },
        },
        load: {
          status: {
            normal: 'Normal',
            fault: 'Fault',
            Appliance: 'Appliance',
            'Load On (Normal)': 'Load On (Normal)',
          },
          sourcePriority: {
            'Grid first': 'Grid first',
            'Solar first': 'Solar first',
            'Solar+Grid': 'Solar+Grid',
            'Solar only': 'Solar only',
            'Grid only': 'Grid only',
          },
        },
        battery: { status: { normal: 'Normal', fault: 'Fault' } },
        system: {
          workingState: {
            Normal: 'Normal',
            Charge: 'Charging',
            Discharge: 'Discharging',
            Fault: 'Fault',
            Idle: 'Idle',
            Appliance: 'Appliance',
          },
        },
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
      data: {
        grid: {
          status: {
            normal: 'Норма',
            fault: 'Ошибка',
            'Mains OK': 'Сеть OK',
          },
          inputRange: {
            APL: 'APL (90–280 В)',
            UPS: 'UPS (170–280 В)',
          },
        },
        pv: {
          status: {
            normal: 'Норма',
            fault: 'Ошибка',
            'PV Undervoltage': 'PV пониженное напряжение',
          },
        },
        load: {
          status: {
            normal: 'Норма',
            fault: 'Ошибка',
            Appliance: 'Потребление',
            'Load On (Normal)': 'Нагрузка (норма)',
          },
          sourcePriority: {
            'Grid first': 'Сеть первая',
            'Solar first': 'Солнце первое',
            'Solar+Grid': 'Солнце+сеть',
            'Solar only': 'Только солнце',
            'Grid only': 'Только сеть',
          },
        },
        battery: { status: { normal: 'Норма', fault: 'Ошибка' } },
        system: {
          workingState: {
            Normal: 'Норма',
            Charge: 'Зарядка',
            Discharge: 'Разряд',
            Fault: 'Ошибка',
            Idle: 'Ожидание',
            Appliance: 'Потребление',
          },
        },
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
