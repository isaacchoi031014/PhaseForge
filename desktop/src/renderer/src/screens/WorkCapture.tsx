import { useEffect, useRef, useState } from 'react'

export function WorkCapture({
  onChange
}: {
  onChange: (photoDataUrl: string | null) => void
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function stopCamera(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setLive(false)
  }

  async function startCamera(): Promise<void> {
    setError(null)
    setPhoto(null)
    onChange(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
        audio: false
      })
      streamRef.current = stream
      setLive(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera unavailable')
    }
  }

  // Attach the stream once the <video> is on screen.
  useEffect(() => {
    if (live && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [live])

  // Make sure the camera is released if we unmount mid-capture.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function capture(): void {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPhoto(dataUrl)
    stopCamera() // turn the webcam off right after capturing
    onChange(dataUrl)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/60">
        {photo ? (
          <img src={photo} alt="Captured work" className="h-full w-full object-contain" />
        ) : live ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] uppercase tracking-widest text-white/80">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              Live
            </span>
          </>
        ) : (
          <div className="px-6 text-center">
            {error ? (
              <p className="text-sm text-red-400/80">{error}</p>
            ) : (
              <p className="text-sm text-[#c4c7c8]/60">Camera is off</p>
            )}
            <p className="mt-1 text-xs text-[#c4c7c8]/40">
              Open the camera when you&apos;re ready to photograph your work.
            </p>
          </div>
        )}
      </div>

      {photo ? (
        <div className="mt-4 flex gap-3">
          <button
            onClick={startCamera}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-[#c4c7c8] transition hover:bg-white/5"
          >
            Retake
          </button>
          <button
            disabled
            className="flex-1 rounded-xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-400"
          >
            ✓ Captured
          </button>
        </div>
      ) : live ? (
        <div className="mt-4 flex gap-3">
          <button
            onClick={stopCamera}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-[#c4c7c8] transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={capture}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.99]"
          >
            Capture
          </button>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="mt-4 rounded-xl bg-white py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.99]"
        >
          {error ? 'Try again' : 'Open camera to photograph work'}
        </button>
      )}
    </div>
  )
}
