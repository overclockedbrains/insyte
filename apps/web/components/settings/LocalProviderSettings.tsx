'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Check } from 'lucide-react'
import { useSettings } from '@/src/stores/hooks'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OllamaModel {
  id: string
  label: string
}

type FetchStatus = 'idle' | 'loading' | 'ok' | 'error'

// ─── Small helpers ────────────────────────────────────────────────────────────

function HealthDot({ status }: { status: FetchStatus }) {
  const color =
    status === 'ok'
      ? 'bg-teal-400'
      : status === 'error'
        ? 'bg-error'
        : 'bg-outline'
  return (
    <span
      className={[
        'inline-block h-2 w-2 rounded-full shrink-0',
        color,
        status === 'ok' ? 'animate-pulse' : '',
      ].join(' ')}
    />
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
      {children}
    </p>
  )
}

function UrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2.5 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
    />
  )
}

// ─── Ollama section ───────────────────────────────────────────────────────────

function OllamaSection() {
  const { ollamaBaseURL, setOllamaBaseURL, model, provider, setProvider, setModel } =
    useSettings()

  const [models, setModels] = useState<OllamaModel[]>([])
  const [status, setStatus] = useState<FetchStatus>('idle')

  const isActive = provider === 'ollama'

  const fetchModels = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch(
        `/api/providers/ollama-models?baseURL=${encodeURIComponent(ollamaBaseURL)}`,
      )
      const data = (await res.json()) as { models: OllamaModel[]; error?: string }
      if (data.models.length === 0) {
        setStatus('error')
        setModels([])
      } else {
        setStatus('ok')
        setModels(data.models)
      }
    } catch {
      setStatus('error')
      setModels([])
    }
  }, [ollamaBaseURL])

  const activateWithModel = useCallback(
    (id: string) => {
      setProvider('ollama')
      setModel(id)
    },
    [setProvider, setModel],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-teal-400">Ollama</span>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-400/10 text-teal-400">
          Local
        </span>
        <HealthDot status={status} />
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed">
        Run models locally on your machine.{' '}
        <span className="text-on-surface-variant/60">
          localhost only works with{' '}
          <span className="font-mono">pnpm dev</span> — use a public URL for
          hosted Ollama.
        </span>
      </p>

      {/* Base URL + refresh */}
      <div className="flex gap-2">
        <div className="flex-1">
          <UrlInput
            value={ollamaBaseURL}
            onChange={setOllamaBaseURL}
            placeholder="http://localhost:11434/v1"
          />
        </div>
        <motion.button
          type="button"
          onClick={fetchModels}
          disabled={status === 'loading'}
          whileTap={{ scale: 0.95 }}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={['h-3.5 w-3.5', status === 'loading' ? 'animate-spin' : ''].join(' ')}
          />
          {status === 'loading' ? 'Fetching…' : 'Fetch models'}
        </motion.button>
      </div>

      {/* Status messages */}
      {status === 'error' && (
        <p className="text-xs text-error px-1">
          Could not reach Ollama. Make sure it is running and CORS is allowed.
        </p>
      )}

      {/* Model picker */}
      {models.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Available models</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {models.map((m) => {
              const isSelected = isActive && model === m.id
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  onClick={() => activateWithModel(m.id)}
                  whileTap={{ scale: 0.95 }}
                  className={[
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-teal-400/20 text-teal-400 border border-teal-400/40'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20 hover:border-outline-variant/50 hover:text-on-surface',
                  ].join(' ')}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {m.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active indicator */}
      {isActive && model && (
        <p className="text-xs text-teal-400">
          Active — using <span className="font-mono">{model}</span>
        </p>
      )}
    </div>
  )
}

// ─── Custom endpoint section ──────────────────────────────────────────────────

function CustomEndpointSection() {
  const {
    customBaseURL,
    customApiKey,
    customModelId,
    setCustomBaseURL,
    setCustomApiKey,
    setCustomModelId,
    provider,
    setProvider,
    model,
  } = useSettings()

  const [justActivated, setJustActivated] = useState(false)
  const isActive = provider === 'custom'

  const handleActivate = useCallback(() => {
    if (!customBaseURL || !customModelId) return
    setProvider('custom')
    setJustActivated(true)
    setTimeout(() => setJustActivated(false), 2000)
  }, [customBaseURL, customModelId, setProvider])

  const canActivate = Boolean(customBaseURL && customModelId)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-purple-400">Custom Endpoint</span>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
          Custom
        </span>
      </div>

      <p className="text-xs text-on-surface-variant">
        Any OpenAI-compatible API — LM Studio, vLLM, Together AI, or a self-hosted endpoint.
      </p>

      {/* Base URL */}
      <div className="space-y-1.5">
        <SectionLabel>Base URL</SectionLabel>
        <UrlInput
          value={customBaseURL}
          onChange={setCustomBaseURL}
          placeholder="https://your-endpoint.com/v1"
        />
      </div>

      {/* Model ID */}
      <div className="space-y-1.5">
        <SectionLabel>Model ID</SectionLabel>
        <input
          type="text"
          value={customModelId}
          onChange={(e) => setCustomModelId(e.target.value)}
          placeholder="e.g. meta-llama/Llama-3-70b-chat-hf"
          spellCheck={false}
          autoComplete="off"
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2.5 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* API key (optional) */}
      <div className="space-y-1.5">
        <SectionLabel>API key (optional)</SectionLabel>
        <input
          type="password"
          value={customApiKey}
          onChange={(e) => setCustomApiKey(e.target.value)}
          placeholder="Leave empty if not required"
          autoComplete="off"
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2.5 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {/* Activate button */}
      <motion.button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        whileTap={{ scale: 0.97 }}
        className={[
          'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
          justActivated
            ? 'bg-purple-400/20 text-purple-400 border border-purple-400/40'
            : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
        ].join(' ')}
      >
        {justActivated ? (
          <>
            <Check className="h-4 w-4" />
            Activated
          </>
        ) : (
          'Use this endpoint'
        )}
      </motion.button>

      {/* Active indicator */}
      {isActive && model && (
        <p className="text-xs text-purple-400">
          Active — using <span className="font-mono">{model}</span> at{' '}
          <span className="font-mono">{customBaseURL}</span>
        </p>
      )}
    </div>
  )
}

// ─── LocalProviderSettings ────────────────────────────────────────────────────

export function LocalProviderSettings() {
  return (
    <div className="space-y-6">
      <OllamaSection />
      <div className="h-px bg-outline-variant/20" />
      <CustomEndpointSection />
    </div>
  )
}
