import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { triggerPwaInstall } from '../lib/pwaInstall'
import { CLUB_NAME } from '../lib/mockData'
import { getSiteOrigin } from '../lib/siteUrl'
import { InAppBrowserBanner } from '../components/ui/InAppBrowserBanner'
import { PwaIosInstallInstructions } from '../components/ui/PwaIosInstallInstructions'

const INSTALL_STEPS = [
  'Tap Install below',
  'Open it from your home screen',
  'Log in with your login name and passcode',
] as const

function DownloadIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function LandingSpinner() {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: '#0A1628' }}
    >
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
      />
    </div>
  )
}

export default function Landing() {
  const { user, loading } = useAuth()
  const { ios, standalone, canPrompt } = usePwaInstall()
  const [installing, setInstalling] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)
  const siteOrigin = getSiteOrigin()

  if (loading) {
    return <LandingSpinner />
  }

  if (user?.is_approved) {
    return <Navigate to="/dashboard" replace />
  }

  if (user && !user.is_approved) {
    return <Navigate to="/pending" replace />
  }

  if (standalone) {
    return <Navigate to="/login" replace />
  }

  const handleInstall = async () => {
    if (ios) {
      setIosOpen(true)
      return
    }

    if (!canPrompt) {
      toast(
        'Install will appear once your browser is ready. Try again after a moment, or use your browser menu.',
        { duration: 5000 },
      )
      return
    }

    setInstalling(true)
    try {
      await triggerPwaInstall()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col overflow-x-hidden"
      style={{ background: '#0A1628', color: '#F4F1E8' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: '-120px',
          width: '280px',
          height: '280px',
          border: '1px solid rgba(212, 175, 55, 0.08)',
        }}
        aria-hidden
      />

      <InAppBrowserBanner />

      <div className="relative z-10 flex flex-1 flex-col items-center px-5 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-full"
            style={{
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
            }}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-14 w-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.svg'
              }}
            />
          </div>

          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: '#D4AF37' }}
          >
            {CLUB_NAME}
          </p>

          <h1
            className="font-display mt-4 text-2xl font-semibold leading-tight"
            style={{ color: '#F4F1E8' }}
          >
            You&apos;re in the squad.
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: '#8B92A3' }}>
            Install the app to see fixtures, mark availability and get match reminders.
          </p>

          <ol className="mt-8 w-full space-y-4 text-left">
            {INSTALL_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: '#D4AF37', color: '#0A1628' }}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 text-sm leading-snug" style={{ color: '#C5CAD6' }}>
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <button
            type="button"
            disabled={installing}
            onClick={handleInstall}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold transition-opacity disabled:opacity-70 touch-manipulation min-h-[52px]"
            style={{ background: '#D4AF37', color: '#0A1628' }}
          >
            <DownloadIcon />
            {installing ? 'Installing…' : 'Install the app'}
          </button>

          <Link
            to="/login"
            className="mt-4 text-sm font-medium transition-opacity hover:opacity-80 touch-manipulation py-2"
            style={{ color: '#D4AF37' }}
          >
            Already installed? Log in
          </Link>

          <div
            className="mt-10 w-full pt-8 flex flex-col items-center gap-4"
            style={{ borderTop: '1px solid rgba(139, 146, 163, 0.25)' }}
          >
            {siteOrigin && (
              <div
                className="rounded-xl p-3"
                style={{ background: '#F4F1E8' }}
              >
                <QRCode
                  value={siteOrigin}
                  size={128}
                  bgColor="#F4F1E8"
                  fgColor="#0A1628"
                  level="M"
                />
              </div>
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: '#F4F1E8' }}>
                Scan on another phone
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#8B92A3' }}>
                Works best from your camera app, not WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      {iosOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-ios-install-title"
          onClick={() => setIosOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-card p-5 shadow-xl"
            style={{ background: '#F4F1E8' }}
            onClick={(event) => event.stopPropagation()}
          >
            <p id="landing-ios-install-title" className="font-semibold font-display" style={{ color: '#0A1628' }}>
              Add BMFC Club Hub to your home screen
            </p>
            <PwaIosInstallInstructions />
            <button
              type="button"
              onClick={() => setIosOpen(false)}
              className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold sm:w-auto touch-manipulation min-h-[44px]"
              style={{ background: '#D4AF37', color: '#0A1628' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
