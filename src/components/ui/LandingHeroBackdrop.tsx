import { useEffect, useRef, type RefObject } from 'react'

const POINTER_LERP = 0.044
const POINTER_FADE = 0.036
const CURSOR_SMOOTH_LERP = 0.052
const GLOW_LERP_PRIMARY = 0.042
const GLOW_LERP_SECONDARY = 0.026
const GLOW_SIZE = 840
const GLOW_HALF = GLOW_SIZE / 2
const IDLE_MS = 3500
const GRID_SPACING = 28
const GRAVITY_RADIUS = 340
const GRAVITY_RADIUS_SQ = GRAVITY_RADIUS * GRAVITY_RADIUS
const MAX_PULL = 58
const MAX_SWIRL = 16
const BASE_DOT_ALPHA = 0.18
const DOT_COLOR = { r: 43, g: 95, b: 192 }
const ACCENT_COLOR = { r: 212, g: 160, b: 23 }

type GridCell = { bx: number; by: number }

function frameLerp(base: number, dt: number): number {
  return 1 - (1 - base) ** (dt * 60)
}

function dotFill(force: number, alpha: number) {
  const t = force * 0.35
  const r = DOT_COLOR.r + (ACCENT_COLOR.r - DOT_COLOR.r) * t
  const g = DOT_COLOR.g + (ACCENT_COLOR.g - DOT_COLOR.g) * t
  const b = DOT_COLOR.b + (ACCENT_COLOR.b - DOT_COLOR.b) * t
  return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`
}

export function LandingHeroBackdrop({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowPrimaryRef = useRef<HTMLDivElement>(null)
  const glowSecondaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const glowPrimary = glowPrimaryRef.current
    const glowSecondary = glowSecondaryRef.current
    if (!container || !canvas || !glowPrimary || !glowSecondary) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const finePointer = window.matchMedia('(pointer: fine)').matches
    let width = 0
    let height = 0
    let dpr = 1
    let cells: GridCell[] = []

    const target = { x: 0, y: 0 }
    const cursorSoft = { x: 0, y: 0 }
    const smooth = { x: 0, y: 0 }
    const glowPrimaryPos = { x: 0, y: 0 }
    const glowSecondaryPos = { x: 0, y: 0 }
    let strength = 0
    let active = false
    let raf = 0
    let time = 0
    let lastFrame = performance.now()
    let docVisible = !document.hidden
    let inView = true
    let lastMoveTime = performance.now()

    const shouldAnimate = () => docVisible && inView

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }

    const startLoop = () => {
      if (raf || !shouldAnimate()) return
      lastFrame = performance.now()
      raf = requestAnimationFrame(draw)
    }

    const syncLoop = () => {
      if (shouldAnimate()) startLoop()
      else stopLoop()
    }

    const rebuildGrid = () => {
      cells = []
      const cols = Math.ceil(width / GRID_SPACING) + 1
      const rows = Math.ceil(height / GRID_SPACING) + 1
      const offsetX = (width - (cols - 1) * GRID_SPACING) / 2
      const offsetY = (height - (rows - 1) * GRID_SPACING) / 2

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          cells.push({
            bx: offsetX + col * GRID_SPACING,
            by: offsetY + row * GRID_SPACING,
          })
        }
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25)
      width = container.clientWidth
      height = container.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      target.x = width / 2
      target.y = height / 2
      rebuildGrid()
      if (!active && strength < 0.02) {
        smooth.x = target.x
        smooth.y = target.y
        cursorSoft.x = target.x
        cursorSoft.y = target.y
        glowPrimaryPos.x = target.x
        glowPrimaryPos.y = target.y
        glowSecondaryPos.x = target.x + 64
        glowSecondaryPos.y = target.y + 48
      }
    }

    const setPointerFromClient = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect()
      target.x = clientX - rect.left
      target.y = clientY - rect.top
      active = true
      lastMoveTime = performance.now()
    }

    const releasePointer = () => {
      active = false
      target.x = width / 2
      target.y = height / 2
      lastMoveTime = performance.now()
    }

    const onVisibility = () => {
      docVisible = !document.hidden
      syncLoop()
    }

    const onMove = (e: MouseEvent) => {
      setPointerFromClient(e.clientX, e.clientY)
    }

    const onLeave = () => {
      releasePointer()
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setPointerFromClient(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setPointerFromClient(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const onTouchEnd = () => {
      releasePointer()
    }

    const draw = (now: number) => {
      if (!shouldAnimate()) {
        raf = 0
        return
      }

      const dt = Math.min((now - lastFrame) / 1000, 0.05)
      lastFrame = now
      time += dt

      const pointerLerp = frameLerp(POINTER_LERP, dt)
      const cursorLerp = frameLerp(CURSOR_SMOOTH_LERP, dt)
      const glowPrimaryLerp = frameLerp(GLOW_LERP_PRIMARY, dt)
      const glowSecondaryLerp = frameLerp(GLOW_LERP_SECONDARY, dt)
      const strengthLerp = frameLerp(POINTER_FADE, dt)

      smooth.x += (target.x - smooth.x) * pointerLerp
      smooth.y += (target.y - smooth.y) * pointerLerp
      cursorSoft.x += (target.x - cursorSoft.x) * cursorLerp
      cursorSoft.y += (target.y - cursorSoft.y) * cursorLerp

      const targetStrength = active ? 1 : 0
      strength += (targetStrength - strength) * strengthLerp

      const interacting = active || strength > 0.02
      const pointerIdle = now - lastMoveTime > IDLE_MS
      const glowIdle = pointerIdle || !interacting

      const idleDriftX =
        width / 2 + Math.sin(time * 0.11) * 36 + Math.sin(time * 0.047) * 18
      const idleDriftY =
        height / 2 + Math.cos(time * 0.09) * 28 + Math.cos(time * 0.053) * 14

      const breatheX =
        Math.sin(time * 0.31) * 14 + Math.sin(time * 0.13 + 1.2) * 9
      const breatheY =
        Math.cos(time * 0.27) * 12 + Math.cos(time * 0.11 + 0.8) * 8
      const breatheMix = glowIdle ? 1 : 0.28

      const glowTargetX = (glowIdle ? idleDriftX : cursorSoft.x) + breatheX * breatheMix
      const glowTargetY = (glowIdle ? idleDriftY : cursorSoft.y) + breatheY * breatheMix
      const idlePulse = glowIdle ? 1 + Math.sin(time * 0.55) * 0.06 : 1

      glowPrimaryPos.x += (glowTargetX - glowPrimaryPos.x) * glowPrimaryLerp
      glowPrimaryPos.y += (glowTargetY - glowPrimaryPos.y) * glowPrimaryLerp

      const orbitAngle = time * 0.09
      const orbitRadius = glowIdle ? 78 : 62
      const secondaryTargetX = glowPrimaryPos.x + Math.cos(orbitAngle) * orbitRadius
      const secondaryTargetY = glowPrimaryPos.y + Math.sin(orbitAngle) * orbitRadius * 0.82
      glowSecondaryPos.x += (secondaryTargetX - glowSecondaryPos.x) * glowSecondaryLerp
      glowSecondaryPos.y += (secondaryTargetY - glowSecondaryPos.y) * glowSecondaryLerp

      const primaryScale = idlePulse
      const secondaryScale = glowIdle ? 1 + Math.sin(time * 0.42 + 0.9) * 0.045 : 0.98 + Math.sin(time * 0.25) * 0.02

      glowPrimary.style.transform = `translate3d(${glowPrimaryPos.x - GLOW_HALF}px, ${glowPrimaryPos.y - GLOW_HALF}px, 0) scale(${primaryScale})`
      glowSecondary.style.transform = `translate3d(${glowSecondaryPos.x - GLOW_HALF}px, ${glowSecondaryPos.y - GLOW_HALF}px, 0) scale(${secondaryScale})`

      const gx = interacting
        ? smooth.x * 0.55 + glowPrimaryPos.x * 0.45
        : width / 2 + Math.sin(time * 0.18) * 32 + Math.sin(time * 0.07) * 14
      const gy = interacting
        ? smooth.y * 0.55 + glowPrimaryPos.y * 0.45
        : height / 2 + Math.cos(time * 0.15) * 26 + Math.cos(time * 0.06) * 12
      const fieldStrength = interacting ? Math.max(strength, 0.2) : 0.35

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < cells.length; i++) {
        const { bx, by } = cells[i]
        const dx = gx - bx
        const dy = gy - by
        const distSq = dx * dx + dy * dy

        let x = bx
        let y = by
        let force = 0

        if (distSq > 0.25 && distSq < GRAVITY_RADIUS_SQ) {
          const dist = Math.sqrt(distSq)
          const t = 1 - dist / GRAVITY_RADIUS
          force = t * t * t * fieldStrength

          const invDist = 1 / dist
          const nx = dx * invDist
          const ny = dy * invDist
          const pull = force * MAX_PULL
          const swirl = force * MAX_SWIRL

          x = bx + nx * pull - ny * swirl * 0.65
          y = by + ny * pull + nx * swirl * 0.65
        }

        const alpha = BASE_DOT_ALPHA + force * 0.5
        const radius = 0.9 + force * 1.35

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = dotFill(force, alpha)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false
        syncLoop()
      },
      { threshold: 0 },
    )
    io.observe(container)

    if (finePointer) {
      container.addEventListener('mousemove', onMove, { passive: true })
      container.addEventListener('mouseleave', onLeave)
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: true })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    document.addEventListener('visibilitychange', onVisibility)

    startLoop()

    return () => {
      ro.disconnect()
      io.disconnect()
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      stopLoop()
    }
  }, [containerRef])

  return (
    <>
      <div
        ref={glowPrimaryRef}
        className="absolute top-0 left-0 rounded-full pointer-events-none z-0 will-change-transform"
        style={{
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          background:
            'radial-gradient(circle, rgba(43,95,192,0.14) 0%, rgba(43,95,192,0.05) 28%, rgba(43,95,192,0.015) 48%, transparent 78%)',
          filter: 'blur(64px)',
        }}
        aria-hidden
      />
      <div
        ref={glowSecondaryRef}
        className="absolute top-0 left-0 rounded-full pointer-events-none z-0 will-change-transform"
        style={{
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          background:
            'radial-gradient(circle, rgba(212,160,23,0.09) 0%, rgba(212,160,23,0.035) 26%, rgba(212,160,23,0.01) 46%, transparent 76%)',
          filter: 'blur(72px)',
        }}
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden
      />
    </>
  )
}
