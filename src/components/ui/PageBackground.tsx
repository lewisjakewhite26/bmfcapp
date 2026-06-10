export function PageBackground() {
  return <div className="fixed inset-0 page-bg -z-10" aria-hidden />
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative page-enter">
      <PageBackground />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
