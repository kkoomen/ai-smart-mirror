export default function PrototypePanel({
  open,
  mode,
  onToggle,
  onModeChange
}) {
  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-full border border-white/15 bg-black/80 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/45 opacity-30 transition hover:opacity-100"
      >
        prototype
      </button>
      {open ? (
        <div className="mt-2 w-52 border border-white/10 bg-black/90 p-3 text-[10px] uppercase tracking-[0.22em] text-white/55 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <p className="mb-2 text-white/35">face simulation</p>
          <div className="flex flex-col gap-1">
            {[
              ["live", "Live camera"],
              ["no_person", "No person"],
              ["registered_user", "Registered user"],
              ["unknown_person", "Unknown person"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value)}
                className={`border px-2 py-2 text-left transition ${
                  mode === value
                    ? "border-white text-white"
                    : "border-white/10 text-white/55 hover:border-white/30 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-white/35">hidden prototype control</p>
        </div>
      ) : null}
    </div>
  );
}
