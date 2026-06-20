import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { initPwaInstallCapture } from './lib/pwaInstall'
import './index.css'

initPwaInstallCapture()

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

if (import.meta.env.VITE_E2E === 'true') {
  import('./hooks/authContext').then(({ saveSession }) => {
    import('./lib/mockData').then(({ completeMockInvite, resetMockDataForE2e }) => {
      const w = window as Window & {
        __BMFC_E2E_RESET__?: () => void
        __BMFC_E2E_FINISH_INVITE__?: (
          token: string,
          firstName: string,
          lastName: string,
          passcode: string,
        ) => ReturnType<typeof completeMockInvite>
      }
      w.__BMFC_E2E_RESET__ = resetMockDataForE2e
      w.__BMFC_E2E_FINISH_INVITE__ = (token, firstName, lastName, passcode) => {
        const user = completeMockInvite(token, firstName, lastName, passcode)
        if (!user) throw new Error('Invalid invite link')
        saveSession(user)
        return user
      }
    })
  })
}

const appTree = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

createRoot(document.getElementById('root')!).render(
  import.meta.env.VITE_E2E === 'true' ? appTree : <StrictMode>{appTree}</StrictMode>,
)
