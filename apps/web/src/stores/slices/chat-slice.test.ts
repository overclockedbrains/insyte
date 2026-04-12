import { describe, it, expect, beforeEach } from 'vitest'
import { useBoundStore } from '../store'

describe('chat-slice', () => {
  beforeEach(() => {
    useBoundStore.setState({
      isOpen: false,
      isMinimized: false,
      messages: [],
      isLoading: false
    })
  })

  it('starts with default state', () => {
    const state = useBoundStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.isMinimized).toBe(false)
    expect(state.messages).toEqual([])
    expect(state.isLoading).toBe(false)
  })

  describe('UI state toggles', () => {
    it('opens chat', () => {
      useBoundStore.getState().openChat()
      expect(useBoundStore.getState().isOpen).toBe(true)
      expect(useBoundStore.getState().isMinimized).toBe(false)
    })

    it('minimizes chat', () => {
      useBoundStore.getState().openChat()
      useBoundStore.getState().minimizeChat()
      expect(useBoundStore.getState().isOpen).toBe(true)
      expect(useBoundStore.getState().isMinimized).toBe(true)
    })

    it('closes chat and clears history', () => {
      useBoundStore.getState().openChat()
      useBoundStore.getState().addUserMessage('hello')

      useBoundStore.getState().closeChat()
      expect(useBoundStore.getState().isOpen).toBe(false)
      expect(useBoundStore.getState().isMinimized).toBe(false)
      expect(useBoundStore.getState().messages).toEqual([]) // ensures history clears
    })
  })

  describe('message dispatching', () => {
    it('adds generic messages', () => {
      useBoundStore.getState().addMessage({ role: 'user', content: 'test msg', timestamp: 123 })
      expect(useBoundStore.getState().messages.length).toBe(1)
      expect(useBoundStore.getState().messages[0]!.content).toBe('test msg')
    })

    it('adds user messages quickly', () => {
      useBoundStore.getState().addUserMessage('give me a tree')
      const msgs = useBoundStore.getState().messages
      expect(msgs.length).toBe(1)
      expect(msgs[0]!.role).toBe('user')
      expect(msgs[0]!.content).toBe('give me a tree')
      expect(msgs[0]!.timestamp).toBeGreaterThan(0)
    })

    it('adds assistant messages', () => {
      useBoundStore.getState().addAssistantMessage('working on it')
      const msgs = useBoundStore.getState().messages
      expect(msgs.length).toBe(1)
      expect(msgs[0]!.role).toBe('assistant')
      expect(msgs[0]!.content).toBe('working on it')
    })
  })

  describe('streaming mutators', () => {
    it('appends to the last assistant message', () => {
      useBoundStore.getState().addAssistantMessage('hello')
      useBoundStore.getState().appendToLastMessage(' world')

      const msgs = useBoundStore.getState().messages
      expect(msgs.length).toBe(1)
      expect(msgs[0]!.content).toBe('hello world')
    })

    it('replaces the last assistant message content entirely', () => {
      useBoundStore.getState().addAssistantMessage('some dirty stream')
      useBoundStore.getState().setLastMessageContent('clean final state')

      const msgs = useBoundStore.getState().messages
      expect(msgs[0]!.content).toBe('clean final state')
    })

    it('does not append if last message is from user', () => {
      useBoundStore.getState().addUserMessage('my command')
      useBoundStore.getState().appendToLastMessage(' invisible chunk')

      const msgs = useBoundStore.getState().messages
      // User message should resist assistant appending
      expect(msgs[0]!.content).toBe('my command')
    })
  })
})
