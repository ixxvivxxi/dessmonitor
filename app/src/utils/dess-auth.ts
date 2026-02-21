const DESS_AUTH_BASE = 'https://web.dessmonitor.com/public/';

function getAuthParamsFromEnv(): AuthSourceParams | null {
  const usr = import.meta.env.VITE_DESS_AUTH_USR;
  const companyKey = import.meta.env.VITE_DESS_AUTH_COMPANY_KEY;
  const sign = import.meta.env.VITE_DESS_AUTH_SIGN;
  const salt = import.meta.env.VITE_DESS_AUTH_SALT;
  if (!usr || !companyKey || !sign || !salt) return null;
  const sourceRaw = import.meta.env.VITE_DESS_AUTH_SOURCE;
  const source = sourceRaw != null ? Number(sourceRaw) : 1;
  return { usr, companyKey, sign, salt, source };
}

export interface AuthSourceParams {
  /** User email */
  usr: string;
  /** Company key */
  companyKey: string;
  /** Auth signature (computed server-side). */
  sign: string;
  /** Salt (e.g. timestamp). */
  salt: string;
  /** Source ID, default 1 */
  source?: number;
}

export interface AuthSourceResponse {
  err: number;
  desc: string;
  success?: boolean;
  dat?: unknown;
  [key: string]: unknown;
}

function buildAuthUrl(params: AuthSourceParams): string {
  const search = new URLSearchParams({
    sign: params.sign,
    salt: params.salt,
    action: 'authSource',
    usr: params.usr,
    source: String(params.source ?? 1),
    'company-key': params.companyKey,
  });
  return `${DESS_AUTH_BASE}?${search.toString()}`;
}

/**
 * Authenticates with DESS Monitor authSource endpoint.
 * Uses params from .env.development (VITE_DESS_AUTH_*) when no params are passed.
 */
export async function authSource(
  params?: Partial<AuthSourceParams> | AuthSourceParams,
): Promise<AuthSourceResponse> {
  const env = getAuthParamsFromEnv();
  const merged = params ? { ...env, ...params } : env;
  if (!merged?.usr || !merged?.companyKey || !merged?.sign || !merged?.salt) {
    throw new Error(
      'Missing auth params. Pass them explicitly or set VITE_DESS_AUTH_* in .env.development',
    );
  }
  const url = buildAuthUrl(merged as AuthSourceParams);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: AuthSourceResponse = await res.json();
  if (json.err !== 0) {
    const msg = getAuthErrorMessage(json.err, json.desc);
    throw new AuthError(json.err, msg, json.desc);
  }
  return json;
}

const DESS_SESSION_KEY = 'dess_auth_session';

/** Error thrown when auth fails (err !== 0). */
export class AuthError extends Error {
  readonly code: number;
  readonly apiDesc: string;

  constructor(code: number, message: string, apiDesc: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.apiDesc = apiDesc;
  }
}

/** Maps API error codes to user-facing messages. */
function getAuthErrorMessage(err: number, desc?: string): string {
  const known: Record<number, string> = {
    261: 'User not found',
    262: 'Invalid credentials',
    263: 'Invalid sign',
    264: 'Session expired',
  };
  return known[err] ?? desc ?? 'Authentication failed';
}

export interface StoredSession {
  usr: string;
  gts: number;
  dat: unknown;
  sign?: string;
  token?: string;
}

/** Runs auth, stores session in localStorage. */
export async function login(params?: Partial<AuthSourceParams>): Promise<AuthSourceResponse> {
  const res = await authSource(params);
  const env = getAuthParamsFromEnv();
  const merged = params ? { ...env, ...params } : env;
  const usr = merged?.usr ?? '';
  const sign = merged?.sign ?? '';
  const tokenFromDat =
    res.dat != null && typeof res.dat === 'object' && 'token' in res.dat
      ? String((res.dat as { token: unknown }).token)
      : undefined;
  const token = tokenFromDat ?? import.meta.env.VITE_DESS_TOKEN ?? undefined;
  const session: StoredSession = {
    usr,
    gts: Date.now(),
    dat: res.dat,
    sign: sign || undefined,
    token: token || undefined,
  };
  localStorage.setItem(DESS_SESSION_KEY, JSON.stringify(session));
  return res;
}

/** Returns stored session or null. */
export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(DESS_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

/** Clears stored session. */
export function logout(): void {
  localStorage.removeItem(DESS_SESSION_KEY);
}
