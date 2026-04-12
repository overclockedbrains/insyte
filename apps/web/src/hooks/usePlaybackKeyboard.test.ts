import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlaybackKeyboard } from './usePlaybackKeyboard'

// ─── Mock usePlayerStore ───────────────────────────────────────────────────────
// Provide a minimal in-memory store so the hook can be tested without the full
// Zustand store graph.

const mockStore = {
  isPlaying: false,
  play:        vi.fn(),
  pause:       vi.fn(),
  stepForward: vi.fn(),
  stepBack:    vi.fn(),
  reset:       vi.fn(),
  setSpeed:    vi.fn(),
}

vi.mock('@/src/stores/player-store', () => ({
  usePlayerStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fireKey(key: string, target?: Partial<HTMLElement>) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  if (target) {
    Object.defineProperty(event, 'target', { value: target })
  }
  window.dispatchEvent(event)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('usePlaybackKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.isPlaying = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls play() when Space is pressed and not playing', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey(' '))
    expect(mockStore.play).toHaveBeenCalledTimes(1)
    expect(mockStore.pause).not.toHaveBeenCalled()
  })

  it('calls pause() when Space is pressed and already playing', () => {
    mockStore.isPlaying = true
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey(' '))
    expect(mockStore.pause).toHaveBeenCalledTimes(1)
    expect(mockStore.play).not.toHaveBeenCalled()
  })

  it('calls stepForward() on ArrowRight', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('ArrowRight'))
    expect(mockStore.stepForward).toHaveBeenCalledTimes(1)
  })

  it('calls stepBack() on ArrowLeft', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('ArrowLeft'))
    expect(mockStore.stepBack).toHaveBeenCalledTimes(1)
  })

  it('calls reset() on Home key', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('Home'))
    expect(mockStore.reset).toHaveBeenCalledTimes(1)
  })

  it('sets speed 0.5× on key "1"', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('1'))
    expect(mockStore.setSpeed).toHaveBeenCalledWith(0.5)
  })

  it('sets speed 1× on key "2"', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('2'))
    expect(mockStore.setSpeed).toHaveBeenCalledWith(1)
  })

  it('sets speed 1.5× on key "3"', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('3'))
    expect(mockStore.setSpeed).toHaveBeenCalledWith(1.5)
  })

  it('sets speed 2× on key "4"', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('4'))
    expect(mockStore.setSpeed).toHaveBeenCalledWith(2)
  })

  it('does NOT trigger when target is an INPUT element', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey(' ', { tagName: 'INPUT' }))
    expect(mockStore.play).not.toHaveBeenCalled()
    expect(mockStore.pause).not.toHaveBeenCalled()
  })

  it('does NOT trigger when target is a TEXTAREA element', () => {
    renderHook(() => usePlaybackKeyboard())
    act(() => fireKey('ArrowRight', { tagName: 'TEXTAREA' }))
    expect(mockStore.stepForward).not.toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => usePlaybackKeyboard())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })
})
