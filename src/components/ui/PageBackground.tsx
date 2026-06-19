export function PageBackground() {
  return <div className="fixed inset-0 page-bg -z-10" aria-hidden />
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative page-enter">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2.5 focus:rounded-pill focus:bg-brand-navy focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:ring-2 focus:ring-brand-gold"
      >
        Skip to content
      </a>
      <PageBackground />
      <div id="main-content" className="relative z-10">
        {children}
      </div>
    </div>
  )
}
