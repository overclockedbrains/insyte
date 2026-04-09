'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowRight, X, Minus, Maximize2 } from 'lucide-react'
import { useIsMobile } from '@/components/hooks/useMediaQuery'
import { useBoundStore } from '@/src/stores/store'
import { useChatStream } from './useChatStream'
import type { ChatMessage } from '@/src/stores/slices/chat-slice'
import { useFocusTrap } from '@/components/hooks/useFocusTrap'

// ─── Breakpoint hook ──────────────────────────────────────────────────────────

// ─── Typing cursor (animated dots) ───────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Individual message bubble ────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className={[
            'max-w-[85%] rounded-2xl px-4 py-2',
            'bg-surface-container-high text-on-surface text-sm leading-relaxed',
            'border border-outline-variant/15',
          ].join(' ')}
        >
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant message — no bubble, left border accent, streaming cursor
  return (
    <div className="flex items-start gap-2">
      <div className="w-0.5 flex-shrink-0 self-stretch bg-primary/40 rounded-full mt-0.5" />
      <div className="flex-1 text-sm text-on-surface leading-relaxed min-w-0 break-words">
        {message.content}
        {/* Blinking cursor while content is empty (first render during streaming) */}
        {message.content === '' && (
          <span
            className="inline-block w-0.5 h-3.5 bg-primary/70 ml-0.5 animate-pulse align-middle"
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}

// ─── Message list ─────────────────────────────────────────────────────────────

function MessageList({ messages, isLoading }: { messages: ChatMessage[]; isLoading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm text-on-surface-variant text-center leading-snug">
          Ask anything about this simulation — or ask me to show you something visually.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-3">
      {messages.map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <MessageBubble message={msg} />
        </motion.div>
      ))}
      {/* Show dots while waiting for first token */}
      {isLoading && messages[messages.length - 1]?.content === '' && (
        <TypingIndicator />
      )}
      <div ref={bottomRef} />
    </div>
  )
}

// ─── Chat input area ──────────────────────────────────────────────────────────

function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (text: string) => void
  isLoading: boolean
}) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to 3 lines
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`
  }, [value])

  const handleSend = useCallback(() => {
    const text = value.trim()
    if (!text || isLoading) return
    onSend(text)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, onSend])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="px-3 pt-2 border-t border-outline-variant/15 flex-shrink-0"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className={[
          'flex items-end gap-2 rounded-2xl',
          'bg-surface-container-high border border-outline-variant/20',
          'px-3 py-2',
          'focus-within:border-primary/30 transition-colors duration-150',
        ].join(' ')}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this simulation…"
          disabled={isLoading}
          rows={1}
          className={[
            'flex-1 resize-none bg-transparent outline-none',
            'text-sm text-on-surface placeholder:text-on-surface-variant/50',
            'leading-relaxed min-h-[24px] max-h-[80px]',
            'disabled:opacity-50',
            'py-0.5',
          ].join(' ')}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className={[
            'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
            'bg-primary/15 text-primary border border-primary/20',
            'hover:bg-primary/25 hover:border-primary/35',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'transition-all duration-150',
          ].join(' ')}
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-on-surface-variant/40 text-center">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}

// ─── Window controls ─────────────────────────────────────────────────────────
// Three always-visible colored symbol buttons — no circles, just icons.
// Close requires a confirmation click since it clears chat history.

function WindowControls({ onClose }: { onClose: () => void }) {
  const minimizeChat = useBoundStore((s) => s.minimizeChat)
  const [confirmingClose, setConfirmingClose] = useState(false)

  function handleCloseClick() {
    if (confirmingClose) {
      onClose()
      setConfirmingClose(false)
    } else {
      setConfirmingClose(true)
    }
  }

  return (
    <div className="flex items-center gap-2" onMouseLeave={() => setConfirmingClose(false)}>

      {/* ── Close — red ── */}
      <div className="relative">
        <button
          onClick={handleCloseClick}
          className={[
            'w-[18px] h-[18px] rounded-full flex items-center justify-center',
            'transition-all duration-150 cursor-pointer',
            confirmingClose
              ? 'bg-[#ff5f57]/30 ring-2 ring-[#ff5f57]/50'
              : 'bg-[#ff5f57]/20 hover:bg-[#ff5f57]/35',
          ].join(' ')}
          aria-label="Close and clear chat"
          title={confirmingClose ? 'Click again to confirm — clears history' : 'Close (clears history)'}
        >
          <X className="w-2.5 h-2.5" style={{ color: '#ff5f57' }} strokeWidth={2.5} />
        </button>

        {/* Warning tooltip */}
        <AnimatePresence>
          {confirmingClose && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={[
                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10',
                'whitespace-nowrap px-2.5 py-1.5 rounded-lg',
                'bg-surface-container-highest border border-[#ff5f57]/20',
                'text-[11px] text-on-surface leading-tight pointer-events-none',
              ].join(' ')}
              style={{ boxShadow: '0 0 8px hsl(240deg 20% 3% / 0.5)' }}
            >
              <span className="font-semibold" style={{ color: '#ff5f57' }}>Clears history.</span>
              {' '}Click again to confirm.
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-container-highest" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Minimize — amber ── */}
      <button
        onClick={minimizeChat}
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[#febc2e]/20 hover:bg-[#febc2e]/35 transition-all duration-150 cursor-pointer"
        aria-label="Minimize chat"
        title="Minimize"
      >
        <Minus className="w-2.5 h-2.5" style={{ color: '#febc2e' }} strokeWidth={2.5} />
      </button>

      {/* ── Expand — green, disabled in R1 ── */}
      <button
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-[#28c840]/10 opacity-35 cursor-not-allowed"
        aria-label="Expand (coming soon)"
        title="Expand (coming soon)"
        disabled
      >
        <Maximize2 className="w-2 h-2" style={{ color: '#28c840' }} strokeWidth={2.5} />
      </button>

    </div>
  )
}

// ─── Card header ──────────────────────────────────────────────────────────────

function CardHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15 flex-shrink-0">
      {/* Title */}
      <div className="flex items-center gap-1.5">
        <span className="flex h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" aria-hidden />
        <span className="text-xs font-medium text-on-surface-variant">Ask insyte</span>
      </div>

      {/* Window controls */}
      <WindowControls onClose={onClose} />
    </div>
  )
}

// ─── Shared card body ─────────────────────────────────────────────────────────

function CardBody({
  onClose,
  isMobile,
  focusTrapActive,
}: {
  onClose: () => void
  isMobile: boolean
  focusTrapActive: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const messages = useBoundStore((s) => s.messages)
  const isLoading = useBoundStore((s) => s.isLoading)
  const { sendMessage } = useChatStream()

  useFocusTrap(focusTrapActive, cardRef)

  return (
    <div
      ref={cardRef}
      className={[
        'flex flex-col h-full',
        'bg-[rgba(19,19,25,0.92)] backdrop-blur-xl',
        'border border-outline-variant/20',
        isMobile ? 'rounded-t-3xl rounded-b-none' : 'rounded-2xl',
      ].join(' ')}
      style={{
        // Uniform elevation — 0 0 offsets so shadow spreads equally on all sides.
        // Blur doubles each layer; opacity decreases so the outer layers are ambient,
        // not glowing. Dark navy hue matches the page background.
        boxShadow: [
          '0 0 1px  hsl(240deg 20% 3% / 0.6)',
          '0 0 4px  hsl(240deg 20% 3% / 0.45)',
          '0 0 10px hsl(240deg 20% 3% / 0.35)',
          '0 0 20px hsl(240deg 20% 3% / 0.2)',
        ].join(', '),
      }}
    >
      <CardHeader onClose={onClose} />
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  )
}

// ─── Desktop floating card ────────────────────────────────────────────────────

function DesktopCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      key="chat-card-desktop"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: 16 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="fixed bottom-24 right-6 z-50 w-80"
      style={{ height: '420px' }}
    >
      <CardBody onClose={onClose} isMobile={false} focusTrapActive={true} />
    </motion.div>
  )
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

function MobileSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet — 60% screen height */}
      <motion.div
        key="chat-card-mobile"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50"
        style={{ height: '60vh' }}
      >
        <CardBody onClose={onClose} isMobile={true} focusTrapActive={true} />
      </motion.div>
    </>
  )
}

// ─── ChatCard ─────────────────────────────────────────────────────────────────

export function ChatCard() {
  const isOpen = useBoundStore((s) => s.isOpen)
  const isMinimized = useBoundStore((s) => s.isMinimized)
  const closeChat = useBoundStore((s) => s.closeChat)
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const visible = isOpen && !isMinimized

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {visible && (isMobile ? (
        <MobileSheet key="mobile-sheet" onClose={closeChat} />
      ) : (
        <DesktopCard key="desktop-card" onClose={closeChat} />
      ))}
    </AnimatePresence>,
    document.body,
  )
}
