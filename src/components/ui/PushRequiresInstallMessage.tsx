import { useState } from 'react'
import toast from 'react-hot-toast'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { triggerPwaInstall } from '../../lib/pwaInstall'
import { PwaIosInstallDialog } from './PwaIosInstallDialog'

interface PushRequiresInstallMessageProps {
  layout?: 'menu' | 'banner'
}

export function PushRequiresInstallMessage({ layout = 'menu' }: PushRequiresInstallMessageProps) {
  const { ios, canPrompt } = usePwaInstall()
  const [installing, setInstalling] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)

  const handleInstall = async () => {
    if (ios) {
      setIosOpen(true)
      return
    }

    if (!canPrompt) {
      toast('Use the Install link in the top bar when your browser is ready.', { duration: 5000 })
      return
    }

    setInstalling(true)
    try {
      await triggerPwaInstall()
    } finally {
      setInstalling(false)
    }
  }

  const installButton = (
    <button
      type="button"
      disabled={installing}
      onClick={handleInstall}
      className={
        layout === 'banner'
          ? 'btn-primary text-sm py-2 px-4 min-h-0'
          : 'text-sm font-medium text-brand-blue hover:text-brand-navy mt-1'
      }
    >
      {installing ? 'Installing…' : 'Install app'}
    </button>
  )

  const message = (
    <p className={layout === 'banner' ? 'text-sm text-gray-500 mt-1' : 'text-sm text-gray-500'}>
      Install the app first to enable notifications.
      {layout === 'menu' && !ios && !canPrompt && (
        <span className="block mt-1">Use the Install link in the top bar when it appears.</span>
      )}
    </p>
  )

  if (layout === 'banner') {
    return (
      <>
        <div className="glass-card p-4 border-l-4 border-brand-blue flex gap-3 items-start">
          <span className="text-2xl shrink-0" aria-hidden>🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-navy">Turn on notifications</p>
            {message}
            <div className="mt-3">{installButton}</div>
          </div>
        </div>

        {iosOpen && (
          <PwaIosInstallDialog onClose={() => setIosOpen(false)} titleId="push-ios-install-title" />
        )}
      </>
    )
  }

  return (
    <>
      <div className="px-3 py-2">
        {message}
        {installButton}
      </div>

      {iosOpen && (
        <PwaIosInstallDialog onClose={() => setIosOpen(false)} titleId="push-ios-install-title" />
      )}
    </>
  )
}
