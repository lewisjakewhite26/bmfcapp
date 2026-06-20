/** Display/login name: "Chris L." */
export function formatPlayerDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim()
  const last = lastName.trim()
  if (!first || !last) return ''
  const initial = last.charAt(0).toUpperCase()
  return `${first} ${initial}.`
}

/** @username base: first initial + surname, e.g. clee */
export function formatPlayerUsernameBase(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0).toLowerCase()
  const last = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  const base = `${first}${last}`.slice(0, 20)
  return base || 'player'
}

export function allocateUniqueUsername(
  base: string,
  isTaken: (candidate: string) => boolean,
): string {
  let candidate = base
  let n = 2
  while (isTaken(candidate)) {
    candidate = `${base}${n}`
    n += 1
  }
  return candidate
}

export function allocateUniqueDisplayName(
  base: string,
  isTaken: (candidate: string) => boolean,
): string {
  if (!isTaken(base)) return base
  let n = 2
  while (isTaken(`${base} ${n}`)) {
    n += 1
  }
  return `${base} ${n}`
}

export function normalizeNamePart(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function validateNamePart(value: string, label: string): string {
  const normalized = normalizeNamePart(value)
  if (normalized.length < 1 || normalized.length > 40) {
    throw new Error(`${label} must be 1–40 characters`)
  }
  if (!/^[a-zA-Z][a-zA-Z' -]*$/.test(normalized)) {
    throw new Error(`${label} can only include letters, spaces, hyphens and apostrophes`)
  }
  return normalized
}
