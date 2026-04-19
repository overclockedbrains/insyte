import type { SceneSkeletonParsed } from '../schemas'

export { validateSteps } from './steps'
export { validatePopups } from './popups'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function getVisualIdSet(skeleton: SceneSkeletonParsed): Set<string> {
  return new Set(skeleton.visuals.map(v => v.id))
}
