/**
 * Supported chart fields; each has a dedicated table (pn, ts, val).
 * Only these 3 fields are fetched and served.
 */
export const CHART_FIELDS = ['output_power', 'pv_output_power', 'bt_battery_voltage'] as const;

export type ChartField = (typeof CHART_FIELDS)[number];

export const CHART_TABLES: Record<ChartField, string> = {
  output_power: 'chart_output_power',
  pv_output_power: 'chart_pv_output_power',
  bt_battery_voltage: 'chart_bt_battery_voltage',
};

export function getChartTable(field: string): string | null {
  const table = CHART_TABLES[field as ChartField];
  return table ?? null;
}

export function isSupportedChartField(field: string): field is ChartField {
  return CHART_FIELDS.includes(field as ChartField);
}

/** 5-min intervals: 24h = 288 points */
export const CHART_POINTS_24H = (24 * 60) / 5;
