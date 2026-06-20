import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { LandingHeroBackdrop } from '../components/ui/LandingHeroBackdrop'
import { CLUB_NAME, LEAGUE_NAME } from '../lib/mockData'

const FEATURES = [
  { title: 'League table', body: 'DDSFL league table for our division, updated when we sync.' },
  { title: 'Results & fixtures', body: 'All our games and scores for the season.' },
  { title: 'Calendar & availability', body: 'Matches, training, socials and fundraisers. Mark in, out or maybe for games and training.' },
  { title: 'Squad stats', body: 'Goals, assists, MOTM, cards and appearances.' },
]

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function Landing() {
  const heroRef = useRef<HTMLElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 100) setShowScrollHint(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <PageShell>
      <Navbar />
      <div className="bg-[#f0f4ff]">
        <section
          ref={heroRef}
          className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-8 select-none touch-manipulation [-webkit-touch-callout:none]"
        >
          <LandingHeroBackdrop containerRef={heroRef} />

          <div className="relative z-10 flex flex-col items-center text-center w-full max-w-[900px] mx-auto">
            <img
              src="/logo.png"
              alt="BMFC"
              className="h-20 w-20 object-contain drop-shadow-md mb-8"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg' }}
            />
            <h1
              className="font-display tracking-tight text-brand-navy leading-[1.05] max-w-[900px]"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}
            >
              <span className="block font-extrabold">BMFC Club Hub</span>
            </h1>
            <p className="text-brand-gold font-semibold text-lg mt-3">{CLUB_NAME}</p>
            <p
              className="text-[#6B7280] font-normal max-w-[500px] mx-auto mt-4 mb-8 leading-relaxed"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}
            >
              Fixtures, table, stats and availability for the squad.
            </p>
            <p className="text-sm text-gray-400 mb-8">{LEAGUE_NAME}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 rounded-pill font-semibold text-white bg-brand-blue shadow-[0_4px_16px_rgba(43,95,192,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(43,95,192,0.3)] min-w-[140px]"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">New player? Use the invite link from your admin.</p>
            <p className="mt-8 text-[0.8rem] text-[#9ca3af]">
              Est. 1984 · Bishop Middleham
            </p>
          </div>

          {showScrollHint && (
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[#9ca3af] text-xl landing-scroll-hint pointer-events-none"
              aria-hidden
            >
              ↓
            </div>
          )}
        </section>

        <section className="px-4 py-16 max-w-5xl mx-auto">
          <FadeUp>
            <h2 className="font-display text-2xl text-brand-navy text-center mb-10">What you get</h2>
          </FadeUp>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.08}>
                <div className="glass-card p-6 h-full">
                  <h3 className="font-bold text-brand-navy mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
