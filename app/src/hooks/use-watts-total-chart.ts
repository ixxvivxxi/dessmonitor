import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

interface ChartPoint {
  ts: string;
  val: number;
}

/** Chart data points every 5 minutes; Dessmonitor API returns power in kW */
const INTERVAL_HOURS = 5 / 60; // 5 min in hours
/** Points for 24h at 5-min intervals */
const POINTS_24H = (24 * 60) / 5;

async function fetchChartField(
  pn: string | null | undefined,
  field: string,
): Promise<ChartPoint[]> {
  const params = new URLSearchParams({ field });
  if (pn) params.set('pn', pn);
  const res = await fetch(apiUrl(`/data/chart?${params}`));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();
  const arr = Array.isArray(json)
    ? json
    : json && typeof json === 'object' && Array.isArray((json as { data?: unknown }).data)
      ? (json as { data: unknown[] }).data
      : null;
  if (!arr || arr.length === 0) return [];
  return arr.map((p: { ts?: string; key?: string; val?: number | string }) => {
    const ts = p.ts ?? (p as { key?: string }).key ?? String(p);
    const rawVal = p.val;
    const val = typeof rawVal === 'number' ? rawVal : Number.parseFloat(String(rawVal ?? 0)) || 0;
    return { ts: String(ts), val };
  });
}

/** Sum power (kW) over 5-min intervals → energy in Wh (API returns kW) */
function totalWh(points: ChartPoint[]): number {
  const last24h = points.length > POINTS_24H ? points.slice(-POINTS_24H) : points;
  const kwh = last24h.reduce((sum, p) => sum + (p.val || 0), 0) * INTERVAL_HOURS;
  return kwh * 1000; // kWh → Wh
}

export function useWattsTotalChart(pn?: string | null): {
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Total generated energy in Wh (last 24h) */
  generatedWh: number | null;
  /** Total consumed energy in Wh (last 24h) */
  consumedWh: number | null;
} {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedWh, setGeneratedWh] = useState<number | null>(null);
  const [consumedWh, setConsumedWh] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const [pvPower, loadPower] = await Promise.all([
        fetchChartField(pn, 'pv_output_power'),
        fetchChartField(pn, 'output_power'),
      ]);

      const gen = pvPower.length > 0 ? totalWh(pvPower) : null;
      const cons = loadPower.length > 0 ? totalWh(loadPower) : null;

      setGeneratedWh(gen);
      setConsumedWh(cons);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
      setGeneratedWh(null);
      setConsumedWh(null);
    } finally {
      setLoading(false);
    }
  }, [pn]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { loading, error, refetch: fetchData, generatedWh, consumedWh };
}
