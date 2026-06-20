import { useCallback, useRef, useState } from 'react'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { PwaIosInstallDialog } from './PwaIosInstallDialog'
import { triggerPwaInstall } from '../../lib/pwaInstall'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function LandingDownloadButton() {
  const { ios, standalone, canPrompt } = usePwaInstall()
  const [iosOpen, setIosOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [installing, setInstalling] = useState(false)

  const arrowRef = useRef<SVGGElement>(null)
  const platformRef = useRef<SVGLineElement>(null)
  const checkRef = useRef<SVGPolylineElement>(null)

  const resetIcon = useCallback(() => {
    const arrow = arrowRef.current
    const platform = platformRef.current
    const check = checkRef.current
    if (!arrow || !platform || !check) return

    gsap.set(arrow, { clearProps: 'all', opacity: 1, y: 0, scale: 1, rotation: 0 })
    gsap.set(platform, { clearProps: 'all', scaleY: 1, transformOrigin: '50% 50%' })
    gsap.set(check, { clearProps: 'all', opacity: 0, scale: 0.75 })
  }, [])

  const playTapFeedback = useCallback(async () => {
    const arrow = arrowRef.current
    const platform = platformRef.current
    const check = checkRef.current
    if (!arrow || !platform || !check) return

    if (prefersReducedMotion()) {
      gsap.set(check, { opacity: 1, scale: 1 })
      await new Promise((resolve) => { window.setTimeout(resolve, 120) })
      resetIcon()
      return
    }

    await new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve })

      tl.to(arrow, {
        y: 8,
        duration: 0.16,
        ease: 'power2.in',
      })
        .to(
          platform,
          {
            scaleY: 0.55,
            transformOrigin: '50% 50%',
            duration: 0.1,
            ease: 'power2.in',
          },
          '-=0.1',
        )
        .to(arrow, {
          y: 0,
          duration: 0.34,
          ease: 'elastic.out(1, 0.55)',
        })
        .to(
          platform,
          {
            scaleY: 1,
            duration: 0.22,
            ease: 'power2.out',
          },
          '-=0.28',
        )
        .to(arrow, {
          opacity: 0,
          scale: 0.65,
          rotation: 8,
          duration: 0.12,
          ease: 'power2.in',
        })
        .fromTo(
          check,
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, duration: 0.16, ease: 'back.out(2)' },
          '-=0.04',
        )
        .to({}, { duration: 0.14 })
    })

    resetIcon()
  }, [resetIcon])

  if (standalone) return null

  const runInstall = async () => {
    if (ios) {
      setIosOpen(true)
      return
    }

    if (!canPrompt) {
      toast(
        'Download will appear here once your browser is ready. Try again after browsing a bit, or use the browser menu.',
        { duration: 5000 },
      )
      return
    }

    try {
      await triggerPwaInstall()
    } catch {
      // triggerPwaInstall handles user dismissal; no extra surface needed.
    }
  }

  const handleClick = async () => {
    if (animating || installing) return
    setAnimating(true)
    try {
      await playTapFeedback()
      if (!ios && canPrompt) setInstalling(true)
      await runInstall()
    } finally {
      setAnimating(false)
      setInstalling(false)
    }
  }

  const busy = animating || installing

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex min-w-[168px] items-center justify-center gap-2.5 rounded-pill bg-brand-gold px-8 py-3 font-semibold text-brand-navy shadow-[0_4px_16px_rgba(212,160,23,0.32)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,160,23,0.4)] touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Download BMFC Club Hub app"
      >
        <span>{installing ? 'Downloading…' : 'Download'}</span>
        <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0 overflow-visible" aria-hidden>
          <line
            ref={platformRef}
            x1="6"
            y1="26"
            x2="26"
            y2="26"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <g ref={arrowRef}>
            <line x1="16" y1="6" x2="16" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <polyline
              points="10,14 16,20 22,14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <polyline
            ref={checkRef}
            points="8,17 13,22 24,10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0}
          />
        </svg>
      </button>

      {iosOpen && <PwaIosInstallDialog onClose={() => setIosOpen(false)} titleId="pwa-ios-install-title" />}
    </>
  )
}
