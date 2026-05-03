'use client'

import { type RefObject, useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/components/hooks/useMediaQuery'
import { useBoundStore } from '@/src/stores/store'
import { generateSlug } from '@/src/lib/slug'

interface UnifiedInputProps {
  fillRef?: RefObject<((text: string) => void) | null>
}

export function UnifiedInput({ fillRef }: UnifiedInputProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const isMobile = useIsMobile()
  const [isNavigating, setIsNavigating] = useState(false)

  const setInput = useBoundStore((s) => s.setInput)
  const inputText = useBoundStore((s) => s.inputText)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setInput(value)
      if (isNavigating) setIsNavigating(false)
    },
    [setInput, isNavigating],
  )

  const handleSubmit = useCallback(() => {
    const topic = inputText.trim()
    if (!topic || isNavigating) return
    setIsNavigating(true)
    const slug = generateSlug(topic)
    router.push(`/s/${slug}?topic=${encodeURIComponent(topic)}`)
  }, [inputText, router, isNavigating])

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
      textareaRef.current?.focus()
    },
    [setInput],
  )

  useEffect(() => {
    if (fillRef) fillRef.current = fill
  }, [fillRef, fill])

  const canSubmit = inputText.trim().length > 0 && !isNavigating

  return (
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
                  '0 0 0 1px var(--color-secondary-alpha-24), 0 0 14px var(--color-secondary-alpha-12), 0 0 22px var(--color-primary-alpha-10)',
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
          placeholder="How does a hash table work? Design a URL shortener..."
          rows={isMobile ? 3 : 2}
          className="landing-no-focus-ring w-full bg-transparent border-0 rounded-2xl px-5 py-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/60 resize-none outline-none leading-relaxed shadow-none focus:ring-0 focus:ring-offset-0 focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none"
          style={{ minHeight: isMobile ? '4.5rem' : '3.25rem' }}
          aria-label="Describe what you want to visualize"
        />
      </div>

      <div className="flex items-center justify-end gap-3 min-h-[2.25rem]">
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
          style={canSubmit ? { background: 'var(--gradient-brand-explore)' } : undefined}
          aria-label="Explore this concept"
        >
          {isNavigating
            ? <><Loader2 className="h-4 w-4 animate-spin" />Loading...</>
            : <>Explore <ArrowRight className="h-3.5 w-3.5" /></>
          }
        </motion.button>
      </div>
    </div>
  )
}
