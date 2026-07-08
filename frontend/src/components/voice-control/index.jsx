export default function VoiceControl({
  prompt,
  transcript,
  onTranscriptChange,
  onSubmit,
  buttonLabel = "Speak",
  helperText,
  disabled = false
}) {
  return (
    <form className="flex w-full flex-col items-center gap-3" onSubmit={onSubmit}>
      <p className="text-xs uppercase tracking-[0.55em] text-white/40">voice control</p>
      <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
        {prompt}
      </div>
      <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 border border-white/20 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
          value={transcript}
          onChange={onTranscriptChange}
          placeholder="Type the voice command or spoken phrase"
          disabled={disabled}
        />
        <button
          type="submit"
          className="border border-white px-5 py-3 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-white/25 disabled:text-white/35 disabled:hover:bg-black disabled:hover:text-white"
          disabled={disabled}
        >
          {buttonLabel}
        </button>
      </div>
      {helperText ? (
        <p className="max-w-2xl text-center text-xs uppercase tracking-[0.25em] text-white/45">
          {helperText}
        </p>
      ) : null}
    </form>
  );
}
