export default {
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
          Appliance: 'Потребление (90–280 В)',
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
          'Invert Mode': 'Режим инвертора',
        },
        sourcePriority: {
          'Grid first': 'Сеть первая',
          'Solar first': 'Солнце первое',
          'Solar+Grid': 'Солнце+сеть',
          'Solar only': 'Только солнце',
          'Grid only': 'Только сеть',
          SBU: 'Солнце первое (SBU)',
          SUB: 'Сеть первая (SUB)',
          US2: 'Сеть и солнце (US2)',
        },
      },
      battery: {
        status: {
          normal: 'Норма',
          fault: 'Ошибка',
          'Battery Charging': 'Зарядка батареи',
          'Battery Discharge': 'Разряд батареи',
          'Battery Float': 'Плавающая зарядка',
          'Battery Equalizing': 'Выравнивание',
        },
      },
      system: {
        workingState: {
          Normal: 'Норма',
          Charge: 'Зарядка',
          Discharge: 'Разряд',
          Fault: 'Ошибка',
          Idle: 'Ожидание',
          Appliance: 'Потребление',
          'Invert Mode': 'Режим инвертора',
        },
      },
    },
  },
}
