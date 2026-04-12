import { describe, it, expect } from 'vitest'
import { HIGHLIGHT_COLORS, resolveHighlight } from './colors'

describe('HIGHLIGHT_COLORS', () => {
  it('contains all required semantic tokens', () => {
    const required = ['default', 'active', 'insert', 'remove', 'hit', 'miss', 'current', 'filled', 'error']
    for (const token of required) {
      expect(HIGHLIGHT_COLORS).toHaveProperty(token)
    }
  })

  it('each token has bg, border, and text fields', () => {
    for (const [token, colors] of Object.entries(HIGHLIGHT_COLORS)) {
      expect(colors, `token "${token}" missing bg`).toHaveProperty('bg')
      expect(colors, `token "${token}" missing border`).toHaveProperty('border')
      expect(colors, `token "${token}" missing text`).toHaveProperty('text')
    }
  })
})

describe('resolveHighlight', () => {
  it('returns default colors for undefined input', () => {
    expect(resolveHighlight(undefined)).toEqual(HIGHLIGHT_COLORS.default)
  })

  it('returns default colors for unknown token', () => {
    expect(resolveHighlight('totally-unknown-token')).toEqual(HIGHLIGHT_COLORS.default)
  })

  it('resolves known tokens to their colors', () => {
    expect(resolveHighlight('active')).toEqual(HIGHLIGHT_COLORS.active)
    expect(resolveHighlight('insert')).toEqual(HIGHLIGHT_COLORS.insert)
    expect(resolveHighlight('remove')).toEqual(HIGHLIGHT_COLORS.remove)
    expect(resolveHighlight('hit')).toEqual(HIGHLIGHT_COLORS.hit)
    expect(resolveHighlight('miss')).toEqual(HIGHLIGHT_COLORS.miss)
    expect(resolveHighlight('current')).toEqual(HIGHLIGHT_COLORS.current)
    expect(resolveHighlight('filled')).toEqual(HIGHLIGHT_COLORS.filled)
    expect(resolveHighlight('error')).toEqual(HIGHLIGHT_COLORS.error)
    expect(resolveHighlight('pivot')).toEqual(HIGHLIGHT_COLORS.pivot)
  })

  it('active and insert differ (not the same color)', () => {
    expect(resolveHighlight('active').border).not.toEqual(resolveHighlight('insert').border)
  })

  it('hit and miss differ (not the same color)', () => {
    expect(resolveHighlight('hit').border).not.toEqual(resolveHighlight('miss').border)
  })

  it('resolves "default" explicitly', () => {
    expect(resolveHighlight('default')).toEqual(HIGHLIGHT_COLORS.default)
  })
})
