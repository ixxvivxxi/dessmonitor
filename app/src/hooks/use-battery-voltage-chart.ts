import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

interface ChartPoint {
  ts: string;
  val: number;
}

/** Steps back from current (5-min intervals): 1h=12, 6h=72, 12h=144, 24h=287 (288 points => index 0) */
const INTERVALS = {
  hour1: 274,
  hour6: 214,
  hour12: 142,
  hour24: 0,
} as const;

const FIELD = 'bt_battery_voltage';

export function useBatteryVoltageChart(pn?: string | null): {
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Voltage at 1h, 6h, 12h, 24h ago (by array index) */
  voltages: {
    hour1: number | null;
    hour6: number | null;
    hour12: number | null;
    hour24: number | null;
  };
  /** Current (most recent) battery voltage in V */
  current: number | null;
} {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<ChartPoint[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ field: FIELD });
      if (pn) params.set('pn', pn);
      const res = await fetch(apiUrl(`/data/chart?${params}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const arr = Array.isArray(json)
        ? json
        : json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)
          ? (json as { data: unknown[] }).data
          : null;
      if (!arr || arr.length === 0) {
        setRawData([]);
        return;
      }
      setRawData(
        arr.map((p: { ts?: string; key?: string; val?: number | string }) => {
          const ts = p.ts ?? (p as { key?: string }).key ?? String(p);
          const rawVal = p.val;
          const val =
            typeof rawVal === 'number' ? rawVal : Number.parseFloat(String(rawVal ?? 0)) || 0;
          return { ts: String(ts), val };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [pn]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const voltageAt = (index: number): number | null => {
    return rawData[index]?.val ?? null;
  };

  const voltages = {
    hour1: voltageAt(INTERVALS.hour1),
    hour6: voltageAt(INTERVALS.hour6),
    hour12: voltageAt(INTERVALS.hour12),
    hour24: voltageAt(INTERVALS.hour24),
  };

  const current = rawData.length > 0 ? rawData[rawData.length - 1]!.val : null;

  return { loading, error, refetch: fetchData, voltages, current };
}
