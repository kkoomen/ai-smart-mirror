export default function VoiceControl({ prompt }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs uppercase tracking-[0.55em] text-white/40">voice control</p>
      <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
        {prompt}
      </div>
    </div>
  );
}
