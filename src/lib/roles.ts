import type { User } from '../types'

export function canAccessFinesAdmin(user: User | null | undefined): boolean {
  return Boolean(user?.is_admin || user?.is_committee || user?.is_fines_admin)
}

export function canAccessAdminHub(user: User | null | undefined): boolean {
  return Boolean(user?.is_admin || user?.is_committee || user?.is_fines_admin)
}

export function isFinesOnlyAdmin(user: User | null | undefined): boolean {
  return Boolean(user?.is_fines_admin && !user?.is_admin && !user?.is_committee)
}

export function adminNavTarget(user: User | null | undefined): string {
  return isFinesOnlyAdmin(user) ? '/admin/fines' : '/admin'
}
