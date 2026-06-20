import { usePushNotifications } from '../../hooks/usePushNotifications'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PushRequiresInstallMessage } from './PushRequiresInstallMessage'

interface PushRequiresInstallPromptProps {
  playerId?: string
}

export function PushRequiresInstallPrompt({ playerId }: PushRequiresInstallPromptProps) {
  const { standalone } = usePwaInstall()
  const { supported, subscribed } = usePushNotifications(playerId)

  if (standalone || !playerId || !supported || subscribed) {
    return null
  }

  return <PushRequiresInstallMessage layout="banner" />
}
