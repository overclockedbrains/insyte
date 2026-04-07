'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene } from '@insyte/scene-engine'
import { useBoundStore } from '@/src/stores/store'
import { ExplanationPanel } from '../annotations/ExplanationPanel'
import { CanvasCard } from './CanvasCard'
import { usePlayback } from '../hooks/usePlayback'

interface Props {
  scene: Scene
}

export function TextLeftCanvasRight({ scene }: Props) {
  const isExpanded = useBoundStore((s) => s.isExpanded)
  const { currentStep } = usePlayback()
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches
      : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const onChange = (event: MediaQueryListEvent) => setIsTablet(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="h-full w-full min-h-0 flex flex-col">
      <div className="hidden md:flex flex-row w-full h-full min-h-0">
        <AnimatePresence initial={false}>
          {!isExpanded && (
            <motion.div
              key="text-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isTablet ? '40%' : '35%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="flex-shrink-0 overflow-hidden border-r border-outline-variant/20 min-h-0"
            >
              <ExplanationPanel
                sections={scene.explanation}
                currentStep={currentStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-4">
          <CanvasCard scene={scene} />
        </div>
      </div>

      <div className="flex md:hidden flex-col w-full min-h-0 flex-1">
        <div className="flex-shrink-0 h-[55vh] flex flex-col p-3">
          <CanvasCard scene={scene} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border-t border-outline-variant/20">
          <ExplanationPanel
            sections={scene.explanation}
            currentStep={currentStep}
          />
        </div>
      </div>
    </div>
  )
}
