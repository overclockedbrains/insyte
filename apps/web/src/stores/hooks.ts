'use client'

import { useBoundStore } from './store'

// ─── Convenience selector hooks ───────────────────────────────────────────────
// Each hook selects only the fields it exposes, preventing unnecessary re-renders.

export function useScene() {
  return useBoundStore((s) => s.activeScene)
}

export function usePlayback() {
  return useBoundStore((s) => ({
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
  }))
}

export function useSettings() {
  return useBoundStore((s) => ({
    provider: s.provider,
    model: s.model,
    apiKeys: s.apiKeys,
    setApiKey: s.setApiKey,
    clearApiKey: s.clearApiKey,
    clearAllKeys: s.clearAllKeys,
    setProvider: s.setProvider,
    setModel: s.setModel,
  }))
}

export function useChat() {
  return useBoundStore((s) => ({
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
  }))
}

export function useDetection() {
  return useBoundStore((s) => ({
    detectedMode: s.detectedMode,
    inputText: s.inputText,
    showConfirmation: s.showConfirmation,
    setInput: s.setInput,
    setMode: s.setMode,
    confirmDSA: s.confirmDSA,
    cancelDSA: s.cancelDSA,
  }))
}

export function useSceneStreaming() {
  return useBoundStore((s) => ({
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
  }))
}
