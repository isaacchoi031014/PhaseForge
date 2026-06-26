import { CosmicBackground } from '../CosmicBackground'

const NEBULA =
  // diagonal milky-way dust band (matches the star band tilt)
  'linear-gradient(114deg, transparent 34%, rgba(120,90,200,0.12) 45%, rgba(70,110,210,0.12) 52%, rgba(205,120,190,0.07) 60%, transparent 70%),' +
  'radial-gradient(ellipse 55% 45% at 30% 26%, rgba(95,60,175,0.16), transparent 60%),' +
  'radial-gradient(ellipse 50% 50% at 76% 74%, rgba(40,85,175,0.14), transparent 60%),' +
  'radial-gradient(circle at 50% 45%, #0b0b18 0%, #050507 80%)'

const VIGNETTE =
  'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 68%, #000 100%)'

export function HomeScreen({ onStart }: { onStart: () => void }): React.JSX.Element {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ background: NEBULA }} />
      <CosmicBackground />
      <div className="pointer-events-none absolute inset-0" style={{ background: VIGNETTE }} />

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.45em] text-white/45">
          Academic Precision
        </p>
        <h1
          className="text-7xl font-light tracking-tight text-white"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            textShadow: '0 2px 40px rgba(0,0,0,0.7)'
          }}
        >
          PhaseForge
        </h1>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
          Secure, adaptive assessment. Enter your code, confirm your identity,
          and begin — proctored at your exam station.
        </p>
        <button
          onClick={onStart}
          className="active-glow mt-12 rounded-full bg-white px-12 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          Start Test
        </button>
      </div>

      <p className="absolute bottom-8 z-10 text-[10px] uppercase tracking-[0.35em] text-white/30">
        Exam Station · TA-Proctored
      </p>
    </div>
  )
}
