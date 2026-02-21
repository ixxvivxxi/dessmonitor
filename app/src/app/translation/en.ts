export default {
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
      urlPlaceholder: 'https://web.dessmonitor.com/public/?sign=...&salt=...&token=...',
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
          Appliance: 'Appliance (90–280 V)',
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
          'Invert Mode': 'Invert Mode',
        },
        sourcePriority: {
          'Grid first': 'Grid first',
          'Solar first': 'Solar first',
          'Solar+Grid': 'Solar+Grid',
          'Solar only': 'Solar only',
          'Grid only': 'Grid only',
          SBU: 'Solar first (SBU)',
          SUB: 'Utility first (SUB)',
          US2: 'Utility Solar (US2)',
        },
      },
      battery: {
        status: {
          normal: 'Normal',
          fault: 'Fault',
          'Battery Charging': 'Battery charging',
          'Battery Discharge': 'Battery discharging',
          'Battery Float': 'Battery float',
          'Battery Equalizing': 'Battery equalizing',
        },
      },
      system: {
        workingState: {
          Normal: 'Normal',
          Charge: 'Charging',
          Discharge: 'Discharging',
          Fault: 'Fault',
          Idle: 'Idle',
          Appliance: 'Appliance',
          'Invert Mode': 'Invert Mode',
        },
      },
    },
  },
};
