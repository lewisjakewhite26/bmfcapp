/** Clearance above the fixed mobile bottom nav (includes home-indicator safe area). */
export const MOBILE_NAV_CLEARANCE = 'pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-8'

/** Extra clearance for admin lineup (player picker bar above bottom nav). */
export const LINEUP_NAV_CLEARANCE = 'pb-[calc(10rem+env(safe-area-inset-bottom))]'

export function pageContainerClass(
  maxWidth = 'max-w-4xl',
  bottomClearance = MOBILE_NAV_CLEARANCE,
) {
  return `${maxWidth} mx-auto px-4 py-5 sm:py-8 space-y-6 ${bottomClearance}`
}
