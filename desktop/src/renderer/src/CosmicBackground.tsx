import { useEffect, useRef } from 'react'

/**
 * A Milky-Way-style starfield: a dense diagonal band of dust + brighter stars,
 * sparser field stars around it, gentle twinkle, subtle star colors, and a
 * cursor sparkle. No constellation lines (that read too "network").
 */
const COLORS = [
  '255,255,255',
  '255,255,255',
  '255,255,255',
  '205,216,255', // blue-white
  '255,236,205', // warm
  '230,205,255' // faint magenta
]

export function CosmicBackground(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    const context = node.getContext('2d')
    if (!context) return
    const canvas = node
    const ctx = context

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let raf = 0
    let mx = -9999
    let my = -9999
    const MOUSE = 150

    type Star = {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      base: number // base brightness
      op: number
      fade: number
      color: string
      band: boolean
    }
    let stars: Star[] = []

    function gauss(): number {
      // ~normal in [-1, 1]
      return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
    }

    function pick(): string {
      return COLORS[Math.floor(Math.random() * COLORS.length)]
    }

    function build(): void {
      stars = []
      const cx = w / 2
      const cy = h / 2
      const ang = -0.42 // band tilt (radians)
      const dir = { x: Math.cos(ang), y: Math.sin(ang) }
      const perp = { x: -Math.sin(ang), y: Math.cos(ang) }
      const len = Math.hypot(w, h)
      const halfWidth = Math.min(w, h) * 0.3

      // Dense galactic band — thousands of dust specks + brighter stars.
      const bandCount = Math.min(2600, Math.floor((w * h) / 1200))
      for (let i = 0; i < bandCount; i++) {
        const t = (Math.random() * 2 - 1) * len * 0.62
        const off = gauss() * halfWidth
        const near = 1 - Math.min(1, Math.abs(off) / halfWidth)
        const bright = Math.random() < 0.07
        stars.push({
          x: cx + dir.x * t + perp.x * off,
          y: cy + dir.y * t + perp.y * off,
          vx: 0,
          vy: 0,
          size: bright ? Math.random() * 1.4 + 1.2 : Math.random() * 0.7 + 0.35,
          base:
            (bright ? 0.7 + Math.random() * 0.3 : 0.16 + Math.random() * 0.28) *
            (0.45 + near * 0.55),
          op: Math.random(),
          fade: Math.random() * 0.018 + 0.004,
          color: pick(),
          band: true
        })
      }

      // Galactic core — a bright dense bulge in the middle of the band.
      const coreCount = Math.min(750, Math.floor((w * h) / 5000))
      for (let i = 0; i < coreCount; i++) {
        const t = gauss() * Math.min(w, h) * 0.34
        const off = gauss() * halfWidth * 0.7
        const bright = Math.random() < 0.16
        stars.push({
          x: cx + dir.x * t + perp.x * off,
          y: cy + dir.y * t + perp.y * off,
          vx: 0,
          vy: 0,
          size: bright ? Math.random() * 1.7 + 1.4 : Math.random() * 0.8 + 0.4,
          base: bright ? 0.8 + Math.random() * 0.2 : 0.24 + Math.random() * 0.34,
          op: Math.random(),
          fade: Math.random() * 0.022 + 0.005,
          color: pick(),
          band: true
        })
      }

      // Field stars across the whole sky (drift slowly).
      const fieldCount = Math.min(360, Math.floor((w * h) / 8000))
      for (let i = 0; i < fieldCount; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          size: Math.random() < 0.85 ? Math.random() * 0.9 + 0.4 : Math.random() * 1.5 + 1,
          base: 0.3 + Math.random() * 0.45,
          op: Math.random(),
          fade: Math.random() * 0.014 + 0.004,
          color: pick(),
          band: false
        })
      }
    }

    function resize(): void {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      build()
    }

    function draw(): void {
      ctx.clearRect(0, 0, w, h)

      for (const s of stars) {
        if (!s.band) {
          s.x += s.vx
          s.y += s.vy
          if (s.x < 0) s.x = w
          if (s.x > w) s.x = 0
          if (s.y < 0) s.y = h
          if (s.y > h) s.y = 0
        }
        s.op += s.fade
        if (s.op > 1 || s.op < 0.25) s.fade = -s.fade

        const md = Math.hypot(s.x - mx, s.y - my)
        const boost = md < MOUSE ? 1 - md / MOUSE : 0
        const alpha = Math.min(1, s.base * (0.55 + s.op * 0.6) + boost * 0.7)

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * (1 + boost * 0.7), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.color},${alpha})`
        if (s.size > 1.1 || boost > 0) {
          ctx.shadowBlur = 6 + boost * 14
          ctx.shadowColor = `rgba(${s.color},0.9)`
        } else {
          ctx.shadowBlur = 0
        }
        ctx.fill()
      }
      ctx.shadowBlur = 0

      raf = requestAnimationFrame(draw)
    }

    function onMove(e: PointerEvent): void {
      const r = canvas.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
