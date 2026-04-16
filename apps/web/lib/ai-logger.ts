/**
 * AI debug logger — server + client, zero dependencies.
 *
 * Server logs (aiLog.server.*) are always-on — no flag needed.
 * Client logs (aiLog.stream.*, aiLog.store.*) require NEXT_PUBLIC_DEBUG_AI=true.
 *
 * Namespaces
 *   aiLog.server.*  — /api/generate route + pipeline stages
 *   aiLog.stream.*  — useStreamScene streaming lifecycle
 *   aiLog.store.*   — store mutations (setScene, clearScene, setStreaming)
 */

const debugClient = process.env.NEXT_PUBLIC_DEBUG_AI === 'true'
const isClient = typeof window !== 'undefined'

// ─── Colour palette (browser only) ───────────────────────────────────────────

const STYLE = {
  server: 'color:#22c55e;font-weight:bold',   // green
  stream: 'color:#a78bfa;font-weight:bold',   // violet
  store: 'color:#60a5fa;font-weight:bold',   // blue
  label: 'color:#e2e8f0',
  meta: 'color:#64748b',
  reset: 'color:inherit',
} as const

// ─── Timing ───────────────────────────────────────────────────────────────────

// Module-level start time — only meaningful on the client (server uses Date.now
// which is per-request; concurrent requests don't share client state).
let _streamStart: number | null = null

function tick(): number {
  return isClient ? performance.now() : Date.now()
}

function elapsedStr(): string {
  if (_streamStart === null) return ''
  const ms = Math.round(tick() - _streamStart)
  return ms < 1000 ? `+${ms}ms` : `+${(ms / 1000).toFixed(1)}s`
}

// ─── Core emit ────────────────────────────────────────────────────────────────

type Namespace = 'server' | 'stream' | 'store'

function emit(
  ns: Namespace,
  event: string,
  data?: Record<string, unknown>,
): void {
  // Server logs are always-on.
  // Client logs are gated by NEXT_PUBLIC_DEBUG_AI=true.
  if (isClient && !debugClient) return

  const prefix = `[AI:${ns}]`
  const time = elapsedStr()

  if (isClient) {
    // Build a rich browser console line with CSS colouring
    const dataStr = data
      ? Object.entries(data)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join('  ')
      : ''

    console.debug(
      `%c${prefix}%c ${event.padEnd(18)}%c${dataStr ? `| ${dataStr} ` : ''}%c${time}`,
      STYLE[ns],
      STYLE.label,
      STYLE.meta,
      STYLE.meta,
    )
  } else {
    // Server: flat structured line — easy to grep in terminal / Vercel logs
    const parts: string[] = [prefix, event.padEnd(22)]
    if (data && Object.keys(data).length) {
      parts.push(
        Object.entries(data)
          .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
          .join('  '),
      )
    }
    console.log(parts.join('  '))
  }
}

// ─── Exported logger ──────────────────────────────────────────────────────────

export const aiLog = {

  // ── Server route (/api/generate) + pipeline ───────────────────────────────

  server: {
    /** Incoming POST — topic, provider, model, tier (free|byok), optional mode */
    request: (
      topic: string,
      provider: string,
      model: string,
      tier: 'free' | 'byok',
      mode?: string,
    ) =>
      emit('server', 'request', {
        topic: topic.slice(0, 80),
        provider,
        model,
        tier,
        ...(mode ? { mode } : {}),
      }),

    /** Rate limit check result */
    rateLimit: (ip: string, allowed: boolean) =>
      emit('server', 'rate-limit', { ip: ip.slice(0, 30), allowed }),

    /** Pipeline stage started — model + temperature used for this stage */
    stageStart: (stage: number, model: string, temp: number) =>
      emit('server', `stage-${stage}:start`, { model, temp }),

    /** Pipeline stage completed successfully */
    stageDone: (stage: number, ms: number) =>
      emit('server', `stage-${stage}:done`, { ms }),

    /** retryStage fired a retry for this stage */
    stageRetry: (stage: number, attempt: number, reason: string) =>
      emit('server', `stage-${stage}:retry`, { attempt, reason: reason.slice(0, 140) }),

    /** Stage failed (non-fatal: stages 3/4; or fatal: caught before error event) */
    stageFail: (stage: number, reason: unknown) =>
      emit('server', `stage-${stage}:fail`, {
        reason: (reason instanceof Error ? reason.message : String(reason)).slice(0, 140),
      }),

    /** Whole pipeline finished — total wall-clock time */
    pipelineDone: (ms: number) =>
      emit('server', 'pipeline-done', { ms }),

    /** Scene cache write result */
    cache: (status: 'saved' | 'skipped' | 'failed', detail?: unknown) =>
      emit('server', `cache:${status}`, detail !== undefined ? { detail: String(detail) } : undefined),

    /** Any unexpected error in the route */
    error: (label: string, err: unknown) =>
      emit('server', `error:${label}`, { msg: err instanceof Error ? err.message : String(err) }),
  },

  // ── Client streaming (useStreamScene) ────────────────────────────────────

  stream: {
    /** Generation started — resets the elapsed timer */
    start: (topic: string, slug?: string) => {
      _streamStart = tick()
      emit('stream', 'start', {
        topic: topic.slice(0, 60),
        ...(slug ? { slug } : {}),
      })
    },

    /** First partial chunk received from the server */
    firstPartial: () =>
      emit('stream', 'first-partial', {}),

    /** A scene field was promoted from draftScene to activeScene */
    promote: (field: string) =>
      emit('stream', 'promote', { field }),

    /** Scene scaffold initialised in store (before fields stream in) */
    sceneInit: (title: string) =>
      emit('stream', 'scene-init', { title: title.slice(0, 60) }),

    /** Streaming complete; scene received */
    complete: () => {
      emit('stream', 'complete', {})
      _streamStart = null
    },

    /** Zod validation result on the final scene */
    validated: (pass: boolean, errorCount?: number) =>
      emit('stream', pass ? 'validated ✓' : 'validated ✗', errorCount ? { errors: errorCount } : undefined),

    /** Retry triggered */
    retry: (attempt: number, reason: string) =>
      emit('stream', 'retry', { attempt, reason }),

    /** AbortController fired */
    abort: () => {
      emit('stream', 'abort', {})
      _streamStart = null
    },

    /** Terminal error shown to the user */
    error: (message: string) =>
      emit('stream', 'error', { message }),
  },

  // ── Store mutations ───────────────────────────────────────────────────────

  store: {
    /** setScene called — either with minimal scaffold or final validated scene */
    setScene: (source: 'minimal' | 'final', title?: string) =>
      emit('store', 'set-scene', {
        source,
        ...(title ? { title: title.slice(0, 50) } : {}),
      }),

    /** clearScene called */
    clearScene: () =>
      emit('store', 'clear-scene', {}),

    /** setStreaming toggled */
    setStreaming: (value: boolean) =>
      emit('store', 'set-streaming', { value }),
  },
}
