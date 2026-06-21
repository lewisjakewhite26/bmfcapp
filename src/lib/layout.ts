/** Applied to #main-content when the fixed mobile bottom nav is shown (approved users). */
export const MAIN_CONTENT_WITH_MOBILE_NAV = 'has-mobile-bottom-nav'

/** Extra scroll clearance on admin lineup (long squad pool + save actions). */
export const LINEUP_EXTRA_BOTTOM = 'pb-12 md:pb-0'

export function pageContainerClass(maxWidth = 'max-w-4xl', extraBottom = '') {
  const base = `${maxWidth} mx-auto px-4 py-5 sm:py-8 space-y-6`
  return extraBottom ? `${base} ${extraBottom}` : base
}

export function mainContentClassName(showMobileBottomNav?: boolean) {
  return showMobileBottomNav
    ? `relative z-10 ${MAIN_CONTENT_WITH_MOBILE_NAV}`
    : 'relative z-10'
}
