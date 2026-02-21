import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api.ts';

export interface Device {
  pn: string;
  sn: string;
  devcode: string;
  devaddr: string;
  devalias?: string;
}

const STORAGE_DEVICES = 'dess_devices';
const STORAGE_SELECTED = 'dess_selected_device';

function getStoredDevices(): Device[] {
  try {
    const raw = localStorage.getItem(STORAGE_DEVICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStoredSelected(): Device | null {
  try {
    const raw = localStorage.getItem(STORAGE_SELECTED);
    if (!raw) return null;
    const d = JSON.parse(raw) as Device;
    return d?.pn && d?.sn ? d : null;
  } catch {
    return null;
  }
}

function setStoredDevices(devices: Device[]): void {
  localStorage.setItem(STORAGE_DEVICES, JSON.stringify(devices));
}

function setStoredSelected(device: Device | null): void {
  if (device) {
    localStorage.setItem(STORAGE_SELECTED, JSON.stringify(device));
  } else {
    localStorage.removeItem(STORAGE_SELECTED);
  }
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>(getStoredDevices);
  const [selected, setSelected] = useState<Device | null>(getStoredSelected);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/credentials/devices'));
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to fetch devices');
      const list = Array.isArray(json.devices) ? json.devices : [];
      setDevices(list);
      setStoredDevices(list);
      return list;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch devices';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const selectDevice = useCallback(async (device: Device) => {
    setSelected(device);
    setStoredSelected(device);
    try {
      const res = await fetch(apiUrl('/credentials/device-params'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pn: device.pn,
          sn: device.sn,
          devcode: device.devcode,
          devaddr: device.devaddr,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to update device');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update device');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchDevices();
      if (cancelled) return;
      const stored = getStoredSelected();
      if (!stored && list[0]) {
        await selectDevice(list[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDevices, selectDevice]);

  return {
    devices,
    selected,
    loading,
    error,
    fetchDevices,
    selectDevice,
  };
}
