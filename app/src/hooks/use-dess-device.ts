import { useState, useEffect, useCallback } from 'react'
import { apiUrl } from '../lib/api.ts'

interface DessParam {
  id: string
  par: string
  val: string
  unit?: string
}

function findVal(params: DessParam[] | undefined, ids: string[]): string | null {
  if (!params) return null
  for (const id of ids) {
    const p = params.find((x) => x.id === id)
    if (p?.val != null) return p.val
  }
  return null
}

export interface DeviceData {
  grid: {
    voltage: number | null
    frequency: number | null
    status: string | null
    inputRange: string | null
  }
  pv: {
    voltage: number | null
    power: number | null
    status: string | null
  }
  battery: {
    voltage: number | null
    capacity: number | null
    status: string | null
    charging: boolean
    chargingCurrent: number | null
    dischargeCurrent: number | null
  }
  load: {
    voltage: number | null
    power: number | null
    frequency: number | null
    status: string | null
    sourcePriority: string | null
  }
  system: {
    workingState: string | null
  }
}

interface BackendLatestResponse {
  pars?: {
    gd_?: DessParam[]
    sy_?: DessParam[]
    pv_?: DessParam[]
    bt_?: DessParam[]
    bc_?: DessParam[]
  }
  gts?: string
  fetchedAt?: number
}

function parseDeviceData(res: BackendLatestResponse): DeviceData {
  const pars = res.pars ?? {}
  const gd = pars.gd_ ?? []
  const sy = pars.sy_ ?? []
  const pv = pars.pv_ ?? []
  const bt = pars.bt_ ?? []
  const bc = pars.bc_ ?? []

  const gv = findVal(gd, ['gd_ac_input_voltage', 'gd_grid_voltage'])
  const gf = findVal(gd, [
    'gd_ac_input_frequency',
    'gd_grid_frequency',
    'gd_rid_frequency',
  ])
  const pvv = findVal(pv, ['pv_input_voltage', 'pv_voltage1'])
  const pvp = findVal(pv, [
    'pv_output_power',
    'pv_input_power',
    'pv_power1',
  ])
  const btv = findVal(bt, ['bt_battery_voltage'])
  const btc = findVal(bt, ['bt_battery_capacity'])
  const btch = findVal(bt, ['bt_battery_charging_current'])
  const btd = findVal(bt, ['bt_battery_discharge_current'])
  const lv = findVal(bc, ['bc_output_voltage', 'bc_load_voltage'])
  const lp = findVal(bc, [
    'bc_output_apparent_power',
    'bc_load_active_power',
    'bc_output_power',
  ])
  const lf = findVal(bc, ['bc_output_frequency'])
  const btStatus = findVal(bt, ['bt_battery_status'])
  const pvStatus = findVal(pv, ['pv_status'])
  const loadStatus = findVal(bc, ['bc_load_status'])
  const sourcePriority = findVal(bc, ['bc_output_source_priority'])
  const gridStatus = findVal(gd, ['gd_mains_status'])
  const inputRange = findVal(gd, ['gd_ac_input_range'])
  const workingState = findVal(sy, ['sy_status'])

  const parseNum = (s: string | null) => (s != null ? parseFloat(s) : null)
  const chargingCurrent = parseNum(btch)
  const charging = (chargingCurrent ?? 0) > 0

  return {
    grid: {
      voltage: parseNum(gv),
      frequency: parseNum(gf),
      status: gridStatus ?? null,
      inputRange: inputRange ?? null,
    },
    pv: {
      voltage: parseNum(pvv),
      power: parseNum(pvp),
      status: pvStatus ?? null,
    },
    battery: {
      voltage: parseNum(btv),
      capacity: parseNum(btc) ?? (btc != null ? parseInt(btc, 10) : null),
      status: btStatus ?? null,
      charging,
      chargingCurrent: parseNum(btch),
      dischargeCurrent: parseNum(btd),
    },
    load: {
      voltage: parseNum(lv),
      power: parseNum(lp),
      frequency: parseNum(lf),
      status: loadStatus ?? null,
      sourcePriority: sourcePriority ?? null,
    },
    system: { workingState: workingState ?? null },
  }
}

const emptyData: DeviceData = {
  grid: { voltage: null, frequency: null, status: null, inputRange: null },
  pv: { voltage: null, power: null, status: null },
  battery: {
    voltage: null,
    capacity: null,
    status: null,
    charging: false,
    chargingCurrent: null,
    dischargeCurrent: null,
  },
  load: {
    voltage: null,
    power: null,
    frequency: null,
    status: null,
    sourcePriority: null,
  },
  system: { workingState: null },
}

interface UseDessDeviceResult extends DeviceData {
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDessDevice(options?: {
  pollIntervalMs?: number
  enabled?: boolean
}): UseDessDeviceResult {
  const [data, setData] = useState<DeviceData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enabled = options?.enabled ?? true

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const res = await fetch(apiUrl('/data/latest'))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: BackendLatestResponse | null = await res.json()
      if (!json) {
        setData(emptyData)
        return
      }
      setData(parseDeviceData(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchData()
    if (!enabled) return
    const interval = options?.pollIntervalMs
    if (interval != null && interval > 0) {
      const id = setInterval(fetchData, interval)
      return () => clearInterval(id)
    }
  }, [fetchData, enabled, options?.pollIntervalMs])

  return { ...data, loading, error, refetch: fetchData }
}
