export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/')) return '/'
  if (next.startsWith('//')) return '/'
  return next
}
