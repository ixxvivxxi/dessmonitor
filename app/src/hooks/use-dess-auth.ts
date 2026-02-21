import { useCallback } from 'react';
import { apiUrl } from '../lib/api.ts';

const STORAGE_DEVICES = 'dess_devices';
const STORAGE_SELECTED = 'dess_selected_device';

/** Clear credentials on backend (resets dessmonitor auth). */
export function useDessAuth() {
  const logout = useCallback(async () => {
    const res = await fetch(apiUrl('/credentials'), { method: 'DELETE' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? 'Failed to clear');
    localStorage.removeItem(STORAGE_DEVICES);
    localStorage.removeItem(STORAGE_SELECTED);
  }, []);

  return { logout };
}
