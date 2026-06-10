/** Clearance above the fixed mobile bottom nav (includes home-indicator safe area). */
export const MOBILE_NAV_CLEARANCE = 'pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8'

export function pageContainerClass(maxWidth = 'max-w-4xl') {
  return `${maxWidth} mx-auto px-4 py-5 sm:py-8 space-y-6 ${MOBILE_NAV_CLEARANCE}`
}
