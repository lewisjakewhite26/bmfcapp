export function PwaShareIcon() {
  return (
    <svg
      className="w-4 h-4 inline-block align-text-bottom mx-0.5 text-brand-blue"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v13" />
      <path d="m16 7-4-4-4 4" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    </svg>
  )
}

export function PwaIosInstallInstructions() {
  return (
    <p className="text-sm text-gray-500 mt-1">
      Tap <PwaShareIcon /> Share, then &ldquo;Add to Home Screen&rdquo; for quick access like an app.
    </p>
  )
}
