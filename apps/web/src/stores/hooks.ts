'use client'

import { useShallow } from 'zustand/react/shallow'
import { useBoundStore } from './store'

// ─── Convenience selector hooks ───────────────────────────────────────────────
// Each hook selects only the fields it exposes, preventing unnecessary re-renders.
//
// IMPORTANT: selectors that return a new object literal must be wrapped in
// useShallow so Zustand compares the result field-by-field (Object.is per key)
// rather than by reference. Without it, every render produces a new object →
// useSyncExternalStore detects an ever-changing snapshot → infinite loop.

export function useScene() {
  return useBoundStore((s) => s.activeScene)
}

export function usePlayback() {
  return useBoundStore(
    useShallow((s) => ({
      currentStep: s.currentStep,
      isPlaying: s.isPlaying,
      totalSteps: s.totalSteps,
      speed: s.speed,
      play: s.play,
      pause: s.pause,
      stepForward: s.stepForward,
      stepBack: s.stepBack,
      reset: s.reset,
      setSpeed: s.setSpeed,
      jumpToStep: s.jumpToStep,
      setTotalSteps: s.setTotalSteps,
    })),
  )
}

export function useSettings() {
  return useBoundStore(
    useShallow((s) => ({
      provider: s.provider,
      model: s.model,
      apiKeys: s.apiKeys,
      setApiKey: s.setApiKey,
      clearApiKey: s.clearApiKey,
      clearAllKeys: s.clearAllKeys,
      setProvider: s.setProvider,
      setModel: s.setModel,
    })),
  )
}

export function useChat() {
  return useBoundStore(
    useShallow((s) => ({
      messages: s.messages,
      isLoading: s.isLoading,
      isOpen: s.isOpen,
      isMinimized: s.isMinimized,
      openChat: s.openChat,
      closeChat: s.closeChat,
      minimizeChat: s.minimizeChat,
      addMessage: s.addMessage,
      setLoading: s.setLoading,
      clearHistory: s.clearHistory,
      appendToLastMessage: s.appendToLastMessage,
    })),
  )
}

export function useDetection() {
  return useBoundStore(
    useShallow((s) => ({
      detectedMode: s.detectedMode,
      inputText: s.inputText,
      showConfirmation: s.showConfirmation,
      setInput: s.setInput,
      setMode: s.setMode,
      confirmDSA: s.confirmDSA,
      cancelDSA: s.cancelDSA,
    })),
  )
}

export function useSceneStreaming() {
  return useBoundStore(
    useShallow((s) => ({
      isStreaming: s.isStreaming,
      streamedFields: s.streamedFields,
      isPatchGlowing: s.isPatchGlowing,
      setStreaming: s.setStreaming,
      markFieldStreamed: s.markFieldStreamed,
      triggerGlow: s.triggerGlow,
      setScene: s.setScene,
      updateScene: s.updateScene,
      clearScene: s.clearScene,
      setDraftScene: s.setDraftScene,
      promoteDraftField: s.promoteDraftField,
    })),
  )
}
