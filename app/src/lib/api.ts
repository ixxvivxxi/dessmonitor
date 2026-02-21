const API_BASE =
  (import.meta.env.VITE_API_URL as string) ||
  (import.meta.env.DEV ? '' : '') // In dev, use relative /api (Vite proxy); set VITE_API_URL in prod

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}/api${p}`
}
