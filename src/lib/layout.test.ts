import { describe, expect, it } from 'vitest'
import {
  LINEUP_EXTRA_BOTTOM,
  MAIN_CONTENT_WITH_MOBILE_NAV,
  mainContentClassName,
  pageContainerClass,
} from './layout'

describe('layout', () => {
  it('pageContainerClass omits bottom nav padding (handled by PageShell)', () => {
    expect(pageContainerClass()).not.toMatch(/pb-\[calc/)
  })

  it('mainContentClassName adds mobile nav clearance class for approved users', () => {
    expect(mainContentClassName(true)).toContain(MAIN_CONTENT_WITH_MOBILE_NAV)
    expect(mainContentClassName(false)).not.toContain(MAIN_CONTENT_WITH_MOBILE_NAV)
  })

  it('lineup page can request extra bottom scroll room', () => {
    expect(pageContainerClass('max-w-4xl', LINEUP_EXTRA_BOTTOM)).toContain(LINEUP_EXTRA_BOTTOM)
  })
})
