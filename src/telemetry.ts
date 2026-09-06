import packageInfo from '../package.json';

export type UsageEvent =
  | 'session_start'
  | 'session_end'
  | 'import_requested'
  | 'import_rejected'
  | 'import_success'
  | 'import_failed'
  | 'play_start'
  | 'play_pause'
  | 'play_complete'
  | 'restart'
  | 'step'
  | 'seek'
  | 'chapter_select'
  | 'settings_change'
  | 'speed_change'
  | 'camera_change'
  | 'zoom'
  | 'pan'
  | 'download'
  | 'language_change';

export type UsageDetails = Record<string, string | number | boolean | undefined>;

const optOutKey = 'svg-player-analytics-opt-out';
const sessionKey = 'svg-player-analytics-session';
const endpoint = new URL('api/usage', document.baseURI).toString();

function readSessionId(): string {
  try {
    const existing = sessionStorage.getItem(sessionKey);
    if (existing && /^[a-z0-9-]{8,80}$/i.test(existing)) return existing;
    const created = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(sessionKey, created);
    return created;
  } catch {
    return `ephemeral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

const sessionId = readSessionId();

export function analyticsOptedOut(): boolean {
  try { return localStorage.getItem(optOutKey) === '1'; }
  catch { return false; }
}

export function setAnalyticsOptOut(value: boolean): void {
  try {
    if (value) localStorage.setItem(optOutKey, '1');
    else localStorage.removeItem(optOutKey);
  } catch { /* optional privacy preference */ }
}

export function analyticsEnabled(): boolean {
  return import.meta.env.PROD && !analyticsOptedOut();
}

function send(body: string): void {
  const payload = new Blob([body], {type:'application/json'});
  try {
    if (navigator.sendBeacon?.(endpoint, payload)) return;
  } catch { /* fall through to fetch */ }
  void fetch(endpoint, {
    method: 'POST',
    body: payload,
    credentials: 'omit',
    keepalive: true,
    headers: {'Content-Type':'application/json'},
  }).catch(() => { /* telemetry must never affect the player */ });
}

export function track(event: UsageEvent, details: UsageDetails = {}): void {
  if (!analyticsEnabled()) return;
  const body = JSON.stringify({
    event,
    sessionId,
    version: packageInfo.version,
    language: document.documentElement.lang === 'zh-CN' ? 'zh' : 'en',
    ...details,
  });
  // Keep telemetry deliberately small and bounded even if a future caller adds a field.
  if (body.length <= 8192) send(body);
}
