/**
 * AI debug logger — server + client, zero dependencies.
 *
 * Enable in .env.local:
 *   NEXT_PUBLIC_DEBUG_AI=true
 *
 * That single flag works everywhere: Next.js exposes NEXT_PUBLIC_* vars to
 * both the server runtime and the browser bundle.
 *
 * Namespaces
 *   aiLog.server.*  — /api/generate route (request, tokens, cache)
 *   aiLog.stream.*  — useStreamScene streaming lifecycle
 *   aiLog.store.*   — store mutations (setScene, clearScene, setStreaming)
 */

const enabled = process.env.NEXT_PUBLIC_DEBUG_AI === 'true'
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
  if (!enabled) return

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
    const parts: string[] = [prefix, event]
    if (data && Object.keys(data).length) {
      parts.push(
        Object.entries(data)
          .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
          .join(' '),
      )
    }
    if (time) parts.push(time)
    console.debug(parts.join('  '))
  }
}

// ─── Exported logger ──────────────────────────────────────────────────────────

export const aiLog = {

  // ── Server route (/api/generate) ──────────────────────────────────────────

  server: {
    /** Incoming POST request */
    request: (topic: string, model: string) =>
      emit('server', 'request', { topic: topic.slice(0, 80), model }),

    /** Rate limit check result */
    rateLimit: (ip: string, allowed: boolean) =>
      emit('server', 'rate-limit', { ip: ip.slice(0, 30), allowed }),

    /** Stream finished — log token counts + finish reason */
    complete: (
      usage: {
        inputTokens?: number
        outputTokens?: number
        reasoningTokens?: number
        textTokens?: number
      },
      finishReason?: string,
    ) =>
      emit('server', 'complete', {
        finishReason: finishReason ?? '?',
        in: usage.inputTokens,
        out: usage.outputTokens,
        ...(usage.reasoningTokens !== undefined && { reasoning: usage.reasoningTokens }),
        ...(usage.textTokens !== undefined && { text: usage.textTokens }),
        ...(finishReason === 'length' && { WARN: 'hit maxOutputTokens — JSON likely truncated' }),
      }),

    /** Scene cache write result */
    cache: (status: 'saved' | 'skipped' | 'failed', detail?: unknown) =>
      emit('server', `cache:${status}`, detail !== undefined ? { detail: String(detail) } : undefined),

    /** Any error in the route */
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
