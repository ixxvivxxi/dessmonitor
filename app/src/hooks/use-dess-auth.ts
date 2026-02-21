import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../lib/api.ts';

interface CredentialsStatus {
  configured: boolean;
  updatedAt: string | null;
}

interface UseDessAuthResult {
  /** True when backend has credentials configured */
  session: boolean;
  loading: boolean;
  error: string | null;
  /** Save credentials from dessmonitor URL (paste from DevTools) */
  saveCredentials: (url: string) => Promise<void>;
  /** Clear credentials on backend */
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useDessAuth(): UseDessAuthResult {
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/credentials/status'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CredentialsStatus = await res.json();
      setSession(json.configured);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach backend');
      setSession(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const saveCredentials = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({ url });
      const res = await fetch(`${apiUrl('/credentials')}?${search.toString()}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to save');
      setSession(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(apiUrl('/credentials'), { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to clear');
      setSession(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear credentials');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    loading,
    error,
    saveCredentials,
    logout,
    clearError,
  };
}
