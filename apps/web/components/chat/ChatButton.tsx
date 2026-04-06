'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Minus } from 'lucide-react'
import { useBoundStore } from '@/src/stores/store'

// ─── PulseRings ───────────────────────────────────────────────────────────────
// Two sonar rings staggered ~0.9s apart so one is always mid-expand while the
// other fades. Creates a continuous "live signal" feel without flashing.

function PulseRings() {
  return (
    <>
      {[0, 0.9].map((delay) => (
        <motion.span
          key={delay}
          className="absolute inset-0 rounded-full border border-primary/40"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            delay,
            ease: [0.2, 0.8, 0.4, 1],
          }}
          aria-hidden
        />
      ))}
    </>
  )
}

// ─── ChatButton ───────────────────────────────────────────────────────────────

export function ChatButton() {
  const isOpen = useBoundStore((s) => s.isOpen)
  const isMinimized = useBoundStore((s) => s.isMinimized)
  const openChat = useBoundStore((s) => s.openChat)
  const minimizeChat = useBoundStore((s) => s.minimizeChat)

  const chatVisible = isOpen && !isMinimized

  function handleClick() {
    if (chatVisible) {
      minimizeChat()
    } else {
      openChat()
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      className={[
        'fixed bottom-6 right-6 z-50',
        'w-12 h-12 rounded-full',
        'flex items-center justify-center',
        'bg-surface-container-high border border-outline-variant/30',
        'hover:border-primary/40 hover:bg-surface-container-highest',
        'focus:outline-none focus:ring-2 focus:ring-primary/30',
        'transition-colors duration-200 cursor-pointer',
      ].join(' ')}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      aria-label={chatVisible ? 'Minimize AI chat' : 'Open AI chat'}
      title={chatVisible ? 'Minimize chat' : 'Ask insyte AI'}
    >
      {/* Sonar rings — only shown when chat is closed/minimized */}
      <AnimatePresence>
        {!chatVisible && <PulseRings key="rings" />}
      </AnimatePresence>

      {/* Icon */}
      <AnimatePresence mode="wait" initial={false}>
        {chatVisible ? (
          <motion.span
            key="minus"
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.18 }}
          >
            <Minus className="w-4 h-4 text-on-surface-variant" strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key="chat"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
          >
            <MessageCircle className="w-[18px] h-[18px] text-primary" strokeWidth={1.8} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
