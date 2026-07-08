export default function CameraPreview({
  videoRef,
  progress,
  statusText,
  faceCentered,
  faceLargeEnough,
  detectedFaceLabel
}) {
  return (
    <section className="relative w-full max-w-2xl overflow-hidden border border-white/15 bg-black/85 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover opacity-90"
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_42%,rgba(0,0,0,0.45)_78%,rgba(0,0,0,0.72)_100%)]" />
        <div className="pointer-events-none absolute inset-0 border border-white/10" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/65 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
        <div className="pointer-events-none absolute left-1/2 top-[14%] h-[4px] w-[40%] -translate-x-1/2 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-[4px] w-[42%] -translate-x-1/2 rounded-full bg-white/15" />

        <div className="absolute left-4 top-4 flex flex-col gap-2 text-[10px] uppercase tracking-[0.3em] text-white/65">
          <span>Camera active</span>
          <span>{statusText}</span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/50">
            <span>Face alignment</span>
            <span>{progress}%</span>
          </div>
          <div className="h-px w-full bg-white/15">
            <div className="h-px bg-white transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em] text-white/50">
            <span>{faceCentered ? "Centered" : "Move to center"}</span>
            <span>{faceLargeEnough ? "Close enough" : "Move closer"}</span>
            <span>{detectedFaceLabel ? `Seen: ${detectedFaceLabel}` : "No face label yet"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
