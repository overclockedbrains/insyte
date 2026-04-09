'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { sandboxManager } from '@/src/sandbox/SandboxManager'

interface PyodideLoaderProps {
  active: boolean
}

export function PyodideLoader({ active }: PyodideLoaderProps) {
  const [progress, setProgress] = useState(sandboxManager.pythonInitializationProgress || 0)
  const [message, setMessage] = useState('Initializing Python runtime... (~10MB)')
  const visible = active && !sandboxManager.pythonReady && progress < 100

  useEffect(() => {
    if (!active) {
      return
    }

    const unsubscribe = sandboxManager.subscribePythonProgress((nextProgress, nextMessage) => {
      setProgress(nextProgress)
      setMessage(nextMessage || 'Initializing Python runtime... (~10MB)')
    })

    if (!sandboxManager.pythonReady) {
      void sandboxManager.initializePython().catch((error) => {
        const text = error instanceof Error ? error.message : 'Failed to initialize Python runtime.'
        setMessage(text)
      })
    }

    return () => {
      unsubscribe()
    }
  }, [active])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/90 px-4 py-3 shadow-[0_0_20px_rgba(183,159,255,0.12)]"
        >
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-on-surface">Initializing Python runtime... (~10MB)</span>
            <span className="font-mono text-on-surface-variant">{Math.round(progress)}%</span>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">{message}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-surface-container">
            <motion.div
              className="h-full rounded-full bg-primary/80"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              transition={{ type: 'spring', stiffness: 170, damping: 26 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
