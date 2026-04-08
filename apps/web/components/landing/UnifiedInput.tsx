'use client'

import { type RefObject, useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useBoundStore } from '@/src/stores/store'
import { detectMode } from '@/src/stores/slices/detection-slice'
import { generateSlug } from '@/src/lib/slug'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { DetectedMode } from '@/src/stores/slices/detection-slice'

const MODE_LABEL: Record<NonNullable<DetectedMode>, string> = {
  concept: 'Concept Mode',
  dsa: 'DSA Trace Mode',
  lld: 'LLD Mode',
  hld: 'System Design Mode',
}

const MODE_COLOR: Record<NonNullable<DetectedMode>, string> = {
  concept: 'text-primary',
  dsa: 'text-secondary',
  lld: 'text-on-surface-variant',
  hld: 'text-tertiary',
}

interface ParsedDSAInput {
  code: string
  language: 'python' | 'javascript'
  problemStatement: string
}

function inferCodeLanguage(input: string): 'python' | 'javascript' {
  if (/\bdef\s+\w+\(|\bimport\s+\w+|\bprint\s*\(/.test(input)) return 'python'
  return 'javascript'
}

function parseDSAInput(rawInput: string): ParsedDSAInput {
  const fenced = rawInput.match(/```(?:\s*(python|py|javascript|js))?\s*\n([\s\S]*?)```/i)
  if (fenced) {
    const rawLang = (fenced[1] ?? '').toLowerCase()
    const fencedCode = fenced[2] ?? ''
    const language: 'python' | 'javascript' =
      rawLang === 'python' || rawLang === 'py'
        ? 'python'
        : rawLang === 'javascript' || rawLang === 'js'
          ? 'javascript'
          : inferCodeLanguage(fencedCode)

    const code = fencedCode.trim()
    const problemStatement = rawInput.replace(fenced[0], '').trim() || 'DSA Trace'
    return { code, language, problemStatement }
  }

  return {
    code: rawInput.trim(),
    language: inferCodeLanguage(rawInput),
    problemStatement: 'DSA Trace',
  }
}

interface UnifiedInputProps {
  fillRef?: RefObject<((text: string) => void) | null>
}

export function UnifiedInput({ fillRef }: UnifiedInputProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [showDSADialog, setShowDSADialog] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  )
  const [isNavigating, setIsNavigating] = useState(false)

  const setInput = useBoundStore((s) => s.setInput)
  const setMode = useBoundStore((s) => s.setMode)
  const inputText = useBoundStore((s) => s.inputText)
  const detectedMode = useBoundStore((s) => s.detectedMode)
  const confirmDSA = useBoundStore((s) => s.confirmDSA)
  const cancelDSA = useBoundStore((s) => s.cancelDSA)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setInput(value)
      setMode(detectMode(value))
      if (isNavigating) {
        setIsNavigating(false)
      }
    },
    [setInput, setMode, isNavigating],
  )

  const navigateToScene = useCallback(
    (topic: string) => {
      setIsNavigating(true)
      const slug = generateSlug(topic)
      router.push(`/s/${slug}?topic=${encodeURIComponent(topic)}`)
    },
    [router],
  )

  const navigateToDSAScene = useCallback(
    (rawInput: string) => {
      setIsNavigating(true)
      const parsed = parseDSAInput(rawInput)
      const slugBase = parsed.problemStatement === 'DSA Trace' ? 'dsa-trace' : parsed.problemStatement
      const slug = generateSlug(slugBase)

      sessionStorage.setItem(
        `insyte:dsa:${slug}`,
        JSON.stringify({
          code: parsed.code,
          language: parsed.language,
          problemStatement: parsed.problemStatement,
        }),
      )

      router.push(
        `/s/${slug}?mode=dsa&lang=${parsed.language}&topic=${encodeURIComponent(parsed.problemStatement)}`,
      )
    },
    [router],
  )

  const handleSubmit = useCallback(() => {
    const topic = inputText.trim()
    if (!topic || isNavigating) return

    if (detectedMode === 'dsa') {
      setShowDSADialog(true)
      return
    }

    navigateToScene(topic)
  }, [inputText, detectedMode, navigateToScene, isNavigating])

  const handleDSAConfirm = useCallback(() => {
    confirmDSA()
    setShowDSADialog(false)
    navigateToDSAScene(inputText.trim())
  }, [confirmDSA, navigateToDSAScene, inputText])

  const handleDSACancel = useCallback(() => {
    cancelDSA()
    setShowDSADialog(false)
    navigateToScene(inputText.trim())
  }, [cancelDSA, navigateToScene, inputText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const fill = useCallback(
    (text: string) => {
      setInput(text)
      setMode(detectMode(text))
      textareaRef.current?.focus()
    },
    [setInput, setMode],
  )

  useEffect(() => {
    if (fillRef) {
      fillRef.current = fill
    }
  }, [fillRef, fill])

  const detectedLanguage = (() => {
    if (!inputText) return null
    if (/\bdef |\bimport |\bprint\s*\(/.test(inputText)) return 'Python'
    if (/\bfunction\b|\bconst\b|\bvar\b|\blet\b/.test(inputText)) return 'JavaScript'
    if (/\bpublic\b.*\bclass\b|\bSystem\.out/.test(inputText)) return 'Java'
    return 'code'
  })()

  const canSubmit = inputText.trim().length > 0 && !isNavigating

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        <div
          className={[
            'relative rounded-2xl overflow-hidden bg-surface-container-low border transition-all duration-200',
            isFocused ? 'border-secondary/38' : 'border-outline-variant/45 shadow-none',
          ].join(' ')}
          style={
            isFocused
              ? {
                  boxShadow:
                    '0 0 0 1px rgba(58,223,250,0.24), 0 0 14px rgba(58,223,250,0.12), 0 0 22px rgba(183,159,255,0.1)',
                }
              : undefined
          }
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="How does a hash table work? Or paste your LeetCode solution..."
            rows={isMobile ? 3 : 2}
            className="landing-no-focus-ring w-full bg-transparent border-0 rounded-2xl px-5 py-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 resize-none outline-none leading-relaxed shadow-none focus:ring-0 focus:ring-offset-0 focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none"
            style={{ minHeight: isMobile ? '4.5rem' : '3.25rem' }}
            aria-label="Describe what you want to visualize"
          />
        </div>

        <div className="flex items-center justify-between gap-3 min-h-[2.25rem]">
          <AnimatePresence mode="wait">
            {detectedMode && (
              <motion.span
                key={detectedMode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`text-xs font-semibold tracking-wide ${MODE_COLOR[detectedMode]}`}
              >
                {MODE_LABEL[detectedMode]}
              </motion.span>
            )}
            {!detectedMode && (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-on-surface-variant/50"
              >
                Type to start...
              </motion.span>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit}
            whileTap={canSubmit ? { scale: 0.96 } : {}}
            className={[
              'shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2',
              canSubmit
                ? 'text-on-primary cursor-pointer hover:opacity-90 active:scale-95'
                : 'opacity-40 cursor-not-allowed text-on-surface-variant bg-surface-container',
            ].join(' ')}
            style={
              canSubmit
                ? { background: 'linear-gradient(135deg, #b79fff 0%, #ab8ffe 100%)' }
                : undefined
            }
            aria-label="Explore this concept"
          >
            {isNavigating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isNavigating ? 'Loading...' : 'Explore ->'}
          </motion.button>
        </div>
      </div>

      <Dialog open={showDSADialog} onOpenChange={setShowDSADialog}>
        <DialogContent className="bg-surface-container-low border border-outline-variant/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-on-surface font-headline text-xl">
              Code detected
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant text-sm leading-relaxed">
              We detected <span className="text-secondary font-semibold">{detectedLanguage ?? 'code'}</span>{' '}
              in your input. Would you like to visualize it as a step-by-step DSA trace,
              or treat it as a concept?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            <button
              onClick={handleDSACancel}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-all duration-200"
            >
              Treat as Concept
            </button>
            <button
              onClick={handleDSAConfirm}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-on-primary hover:opacity-90 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #3adffa 0%, #1ad0eb 100%)',
              }}
            >
              Visualize {'->'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
