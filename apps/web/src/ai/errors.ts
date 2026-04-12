/**
 * Thrown by per-stage validators when validation fails.
 * The `stage` field lets the streaming UX (Phase 26) display
 * a stage-specific error message rather than a generic failure.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly stage: number,
    public readonly retryable: boolean = true,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
