'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, AlertTriangle, ExternalLink, Gauge } from 'lucide-react'
import { useSettings } from '@/src/stores/hooks'
import type { Provider } from '@/src/stores/slices/settings-slice'
import { ProviderSelector } from '@/components/settings/ProviderSelector'
import { ModelSelector } from '@/components/settings/ModelSelector'
import { ApiKeyInput } from '@/components/settings/ApiKeyInput'
import { ActiveProviderStatus } from '@/components/settings/ActiveProviderStatus'
import { GITHUB_URL, SITE } from '@/src/lib/config'

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 space-y-4">
      <div>
        <h2 className="font-headline font-bold text-lg text-on-surface">{title}</h2>
        {description && (
          <p className="text-sm text-on-surface-variant mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── All-provider API key inputs ──────────────────────────────────────────────

const ALL_PROVIDERS: { id: Provider; name: string; note: string }[] = [
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    note: 'Get your key at aistudio.google.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    note: 'Get your key at platform.openai.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    note: 'Get your key at console.anthropic.com',
  },
  {
    id: 'groq',
    name: 'Groq',
    note: 'Get your key at console.groq.com',
  },
]

// ─── Clear-all confirmation dialog ───────────────────────────────────────────

function ClearAllDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="glass-panel glow-border rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
                  <AlertTriangle className="h-5 w-5 text-error" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Clear all keys?</p>
                  <p className="text-xs text-on-surface-variant">
                    This will remove all saved API keys.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded-xl bg-error/10 border border-error/30 px-4 py-2.5 text-sm font-semibold text-error hover:bg-error/20 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { apiKeys, clearAllKeys } = useSettings()
  const [showClearDialog, setShowClearDialog] = useState(false)

  const hasAnyKey = Object.values(apiKeys).some(Boolean)

  const handleClearAll = useCallback(() => {
    clearAllKeys()
    setShowClearDialog(false)
  }, [clearAllKeys])

  return (
    <>
      <ClearAllDialog
        open={showClearDialog}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
      />

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 space-y-6">

        {/* ── Header ── */}
        <div className="space-y-1">
          <h1 className="font-headline font-extrabold text-4xl text-on-surface">
            Settings
          </h1>
          <p className="text-on-surface-variant">
            Customize your AI experience
          </p>
        </div>

        {/* ── Active status ── */}
        <ActiveProviderStatus />

        {/* ── 1. AI Provider ── */}
        <SectionCard
          title="AI Provider"
          description="Choose which AI powers your simulations."
        >
          <ProviderSelector />
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
              Model
            </p>
            <ModelSelector />
          </div>
        </SectionCard>

        {/* ── 2. API Keys ── */}
        <SectionCard
          title="API Keys"
          description="Your keys are stored locally in your browser and only forwarded to the AI provider — never stored on our servers."
        >
          {/* Security note */}
          <div className="flex items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
            <span className="text-lg shrink-0">🔒</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <span className="font-semibold text-on-surface">
                Your key is stored locally in your browser.
              </span>{' '}
              It is forwarded to the AI provider through our servers only to process your request — it is never logged, stored, or retained beyond the request.
            </p>
          </div>

          {/* Per-provider key inputs */}
          <div className="space-y-5">
            {ALL_PROVIDERS.map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-on-surface">
                    {p.name}
                  </label>
                  <span className="text-xs text-on-surface-variant">{p.note}</span>
                </div>
                <ApiKeyInput provider={p.id} />
              </div>
            ))}
          </div>

          {/* Clear all button */}
          {hasAnyKey && (
            <motion.button
              type="button"
              onClick={() => setShowClearDialog(true)}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl border border-error/20 bg-error/5 px-4 py-2.5 text-sm font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Clear all keys
            </motion.button>
          )}
        </SectionCard>

        {/* ── 3. Preferences ── */}
        <SectionCard
          title="Preferences"
          description="Animation and display settings."
        >
          <div className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
            <div className="flex items-center gap-3">
              <Gauge className="h-4 w-4 text-on-surface-variant shrink-0" />
              <div>
                <p className="text-sm font-medium text-on-surface">
                  Animation speed
                </p>
                <p className="text-xs text-on-surface-variant">
                  Coming soon — control default playback speed
                </p>
              </div>
            </div>
            <span className="text-xs text-on-surface-variant px-2 py-1 rounded-full bg-surface-container-highest">
              v2
            </span>
          </div>
        </SectionCard>

        {/* ── 4. About ── */}
        <SectionCard title="About">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Version</span>
              <span className="font-mono text-on-surface">0.1.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Product</span>
              <span className="font-semibold text-on-surface">{SITE.name}</span>
            </div>
            <div className="h-px bg-outline-variant/20" />
            <div className="space-y-2">
              <p className="text-xs text-on-surface-variant">
                insyte is open source. Contributions and feedback welcome.
              </p>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </SectionCard>

      </div>
    </>
  )
}
