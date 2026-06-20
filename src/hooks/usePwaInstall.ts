import { useEffect, useReducer } from 'react'
import {
  canTriggerPwaInstall,
  getPwaInstallEvent,
  isIosDevice,
  isStandalonePwa,
  subscribePwaInstall,
} from '../lib/pwaInstall'

export function usePwaInstall() {
  const [, refresh] = useReducer((n: number) => n + 1, 0)

  useEffect(() => subscribePwaInstall(refresh), [])

  return {
    ios: isIosDevice(),
    standalone: isStandalonePwa(),
    installEvent: getPwaInstallEvent(),
    canPrompt: canTriggerPwaInstall(),
  }
}
