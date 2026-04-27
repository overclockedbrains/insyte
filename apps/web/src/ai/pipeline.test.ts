import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LanguageModel } from 'ai'
import type { ModelConfig } from './client'
import type { SceneSkeletonParsed, StepsParsed, PopupsParsed, MiscParsed } from './schemas'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return {
    ...actual,
    generateObject: vi.fn(),
    generateJson: vi.fn(),
  }
})

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    streamText: vi.fn(() => ({
      textStream: (async function* () { yield 'reasoning text' })(),
    })),
  }
})

vi.mock('./assembly', () => ({
  assembleScene: vi.fn(() => ({
    ok: true,
    scene: {
      id: 'test-scene',
      title: 'Test Scene',
      type: 'concept',
      layout: 'canvas-only',
      canvas: [],
      steps: [],
      popups: [],
      challenges: [],
    },
  })),
}))

vi.mock('@/lib/ai-logger', () => ({
  aiLog: {
    server: {
      stageStart: vi.fn(),
      stageDone: vi.fn(),
      stageFail: vi.fn(),
      stageRetry: vi.fn(),
      pipelineDone: vi.fn(),
      rateLimit: vi.fn(),
      request: vi.fn(),
      cache: vi.fn(),
      error: vi.fn(),
    },
    stream: { start: vi.fn(), firstPartial: vi.fn(), sceneInit: vi.fn(), complete: vi.fn(), error: vi.fn(), retry: vi.fn(), abort: vi.fn(), validated: vi.fn() },
    store: { setScene: vi.fn(), setStreaming: vi.fn(), clearScene: vi.fn() },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSkeleton(): SceneSkeletonParsed {
  return {
    title: 'Binary Search',
    type: 'dsa-trace',
    canvas: [{ id: 'arr', type: 'linear', variant: 'array', layoutHint: 'linear-H' }],
    stepCount: 2,
  }
}

function makeSteps(): StepsParsed {
  const items = [{ id: 'a0', value: '1' }, { id: 'a1', value: '2' }, { id: 'a2', value: '3' }]
  return {
    initialStates: { arr: { items } },
    steps: [
      { index: 1, explanation: { heading: 'Step 1', body: 'body' }, canvas: { arr: { items: [items[0]!] } } },
      { index: 2, explanation: { heading: 'Step 2', body: 'body' }, canvas: { arr: { items: [items[1]!] } } },
    ],
  }
}

function makePopups(): PopupsParsed {
  return { popups: [] }
}

function makeMisc(): MiscParsed {
  return { challenges: [{ title: 'Test', description: 'Describe', type: 'predict' }] }
}

function makeModelConfig(): ModelConfig {
  return {
    model: {} as LanguageModel,
    providerOptions: {},
    byokModel: null,
    createModel: () => ({} as LanguageModel),
    providerName: 'gemini',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateScene pipeline', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // vi.clearAllMocks() clears call records but NOT mockResolvedValueOnce queues.
    // Explicitly reset so leftover queued values from a previous test don't leak
    // into the next test's Stage 1 mock and corrupt the skeleton return value.
    const { generateObject, generateJson } = await import('./client')
    vi.mocked(generateObject).mockReset()
    vi.mocked(generateJson).mockReset()
  })

  it('happy path — emits reasoning → plan → content → annotations → misc → complete', async () => {
    const { generateObject, generateJson } = await import('./client')
    vi.mocked(generateJson).mockResolvedValue(makeSteps())
    vi.mocked(generateObject)
      .mockResolvedValueOnce(makeSkeleton())   // Stage 1
      .mockResolvedValueOnce(makePopups())     // Stage 3
      .mockResolvedValueOnce(makeMisc())       // Stage 4

    const { generateScene } = await import('./pipeline')
    const events = []
    for await (const event of generateScene('binary search', undefined, makeModelConfig())) {
      events.push(event.type)
    }

    expect(events).toContain('reasoning')
    expect(events).toContain('plan')
    expect(events).toContain('content')
    expect(events).toContain('complete')
    expect(events.at(-1)).toBe('complete')
  })

  it('Stage 2 failure + retry — yields error after max retries', async () => {
    const { generateObject, generateJson } = await import('./client')
    vi.mocked(generateObject).mockResolvedValueOnce(makeSkeleton())  // Stage 1
    vi.mocked(generateJson).mockRejectedValue(new Error('model overloaded'))

    const { generateScene } = await import('./pipeline')
    const events = []
    for await (const event of generateScene('binary search', undefined, makeModelConfig())) {
      events.push(event)
    }

    const errorEvent = events.find(e => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent?.type === 'error' && errorEvent.stage).toBe(2)
  })

  it('Stage 3/4 non-fatal failure — complete event still emitted', async () => {
    const { generateObject, generateJson } = await import('./client')
    vi.mocked(generateJson).mockResolvedValue(makeSteps())
    vi.mocked(generateObject)
      .mockResolvedValueOnce(makeSkeleton())                         // Stage 1
      .mockRejectedValueOnce(new Error('stage 3 failed'))           // Stage 3
      .mockRejectedValueOnce(new Error('stage 4 failed'))           // Stage 4

    const { generateScene } = await import('./pipeline')
    const events = []
    for await (const event of generateScene('binary search', undefined, makeModelConfig())) {
      events.push(event)
    }

    expect(events.find(e => e.type === 'complete')).toBeDefined()
    expect(events.find(e => e.type === 'annotations')).toBeUndefined()
    expect(events.find(e => e.type === 'misc')).toBeUndefined()
  })

  it('Stage 2 timeout — yields stage 2 error', async () => {
    const { generateObject, generateJson } = await import('./client')
    vi.mocked(generateObject).mockResolvedValueOnce(makeSkeleton())
    vi.mocked(generateJson).mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stage timed out after 60000ms')), 10),
      ),
    )

    const { generateScene } = await import('./pipeline')
    const events = []
    for await (const event of generateScene('binary search', undefined, makeModelConfig())) {
      events.push(event)
    }

    const errorEvent = events.find(e => e.type === 'error')
    expect(errorEvent?.type === 'error' && errorEvent.stage).toBe(2)
  })
})
