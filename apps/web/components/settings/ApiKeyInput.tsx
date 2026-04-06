'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { useSettings } from '@/src/stores/hooks'
import { REGISTRY } from '@/src/ai/registry'
import type { Provider } from '@/src/ai/registry'

const MIN_KEY_LENGTH = 20

// ─── ApiKeyInput ──────────────────────────────────────────────────────────────

interface ApiKeyInputProps {
  provider: Provider
}

export function ApiKeyInput({ provider }: ApiKeyInputProps) {
  const { apiKeys, setApiKey, clearApiKey } = useSettings()
  const { shortName, keyPlaceholder } = REGISTRY[provider]

  const savedKey = apiKeys[provider]
  const hasKey = Boolean(savedKey)

  const [inputValue, setInputValue] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed.length < MIN_KEY_LENGTH) {
      setValidationError(`Key must be at least ${MIN_KEY_LENGTH} characters.`)
      return
    }
    setValidationError('')
    setApiKey(provider, trimmed)
    setInputValue('')
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }, [inputValue, provider, setApiKey])

  const handleClear = useCallback(() => {
    clearApiKey(provider)
    setInputValue('')
    setValidationError('')
    setJustSaved(false)
  }, [provider, clearApiKey])

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait">
        {hasKey ? (
          /* ── Saved state ── */
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center justify-between rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-secondary shrink-0" />
              <span className="text-sm font-medium text-secondary">
                {shortName} key saved
              </span>
              <span className="text-xs text-on-surface-variant font-mono">
                ···{savedKey!.slice(-4)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </motion.div>
        ) : (
          /* ── Input state ── */
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            {/* form wrapper silences the "password not in a form" browser warning */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSave() }}
              className="flex gap-2"
            >
              {/* Key input */}
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    if (validationError) setValidationError('')
                  }}
                  placeholder={keyPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  className={[
                    'w-full rounded-xl border bg-surface-container-low px-4 py-2.5 pr-10',
                    'font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40',
                    'outline-none transition-colors duration-150',
                    'focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
                    validationError
                      ? 'border-error/50'
                      : 'border-outline-variant/30',
                  ].join(' ')}
                />
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Save button — type="submit" so Enter key works via the form */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.95 }}
                className={[
                  'shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 cursor-pointer',
                  justSaved
                    ? 'bg-secondary/20 text-secondary'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
                ].join(' ')}
              >
                {justSaved ? <Check className="h-4 w-4" /> : 'Save'}
              </motion.button>
            </form>

            {/* Validation error */}
            <AnimatePresence>
              {validationError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-error px-1"
                >
                  {validationError}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
