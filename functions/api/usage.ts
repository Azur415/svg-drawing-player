interface AnalyticsEngineDataset {
  writeDataPoint(data: {blobs: string[]; doubles: number[]; indexes: string[]}): void;
}

interface Env {
  ANALYTICS_ENGINE?: AnalyticsEngineDataset;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const events = new Set([
  'session_start', 'session_end',
  'import_requested', 'import_rejected', 'import_success', 'import_failed',
  'play_start', 'play_pause', 'play_complete', 'restart', 'step', 'seek',
  'chapter_select', 'settings_change', 'speed_change', 'camera_change',
  'zoom', 'pan', 'download', 'language_change',
]);
const sources = new Set(['file', 'drop', 'example', 'unknown']);
const reasons = new Set(['multiple', 'type', 'size', 'xml', 'elements', 'empty', 'references', 'failed', 'unknown']);
const modes = new Set(['quick', 'full', 'unknown']);
const cameras = new Set(['follow', 'overview', 'manual', 'unknown']);
const layouts = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const directions = new Set(['previous', 'next', 'in', 'out', 'unknown']);
const languages = new Set(['zh', 'en', 'unknown']);
const maxBodyLength = 8192;

function text(value: unknown, fallback = 'unknown', max = 80): string {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : fallback;
}

function number(value: unknown, max = 1_000_000_000): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
}

function choice(value: unknown, allowed: Set<string>): string {
  const candidate = text(value);
  return allowed.has(candidate) ? candidate : 'unknown';
}

function bad(status: number): Response {
  return new Response(null, {status, headers: {'Cache-Control':'no-store'}});
}

export async function onRequestPost({request, env}: PagesContext): Promise<Response> {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > maxBodyLength) return bad(413);

  let data: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > maxBodyLength) return bad(413);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bad(400);
    data = parsed as Record<string, unknown>;
  } catch {
    return bad(400);
  }

  const event = text(data.event);
  if (!events.has(event)) return bad(400);

  // Only explicit, coarse client fields are written. Request headers, IP and raw SVG
  // content are intentionally not inspected or stored here.
  const rawSessionId = text(data.sessionId, 'anonymous', 80);
  const sessionId = /^[a-z0-9-]{8,80}$/i.test(rawSessionId) ? rawSessionId : 'anonymous';
  const source = choice(data.source, sources);
  const reason = choice(data.reason, reasons);
  const language = choice(data.language, languages);
  const version = /^[a-z0-9.-]{1,32}$/i.test(text(data.version, 'unknown', 32)) ? text(data.version, 'unknown', 32) : 'unknown';
  const mode = choice(data.mode, modes);
  const camera = choice(data.camera, cameras);
  const layout = choice(data.layout, layouts);
  const direction = choice(data.direction, directions);

  try {
    env.ANALYTICS_ENGINE?.writeDataPoint({
      // Keep the order stable. These map to blob1..blob10 in Analytics Engine SQL.
      blobs: [event, version, source, language, sessionId, reason, mode, camera, layout, direction],
      // These map to double1..double13 in Analytics Engine SQL.
      doubles: [
        number(data.fileBytes), number(data.elementCount), number(data.chapterCount),
        number(data.warningCount), number(data.processingMs), number(data.positionMs),
        number(data.durationMs), number(data.chapterIndex, 100_000), number(data.speed, 100),
        number(data.targetSeconds, 86_400), number(data.fileCount, 100_000), number(data.value),
        number(data.artworkIndex, 100_000),
      ],
      // No sampling key is provided; sessionId remains a short-lived anonymous dimension.
      indexes: [],
    });
  } catch {
    // Usage telemetry is best effort and must never surface as an application error.
  }
  return new Response(null, {status:204, headers: {'Cache-Control':'no-store'}});
}

export function onRequestOptions(): Response {
  return new Response(null, {status:204, headers: {'Cache-Control':'no-store'}});
}
