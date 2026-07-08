export default function MirrorLayout({
  weather,
  time,
  agenda,
  deviceStatus,
  center,
  showPanels = true
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        {showPanels ? (
          <>
            <header className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="lg:justify-self-start">{weather}</div>
              <div className="lg:justify-self-end lg:text-right">{time}</div>
            </header>

            <section className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-5xl px-2 py-6 sm:px-0">{center}</div>
            </section>

            <footer className="grid gap-6 lg:grid-cols-2 lg:items-end">
              <div className="lg:justify-self-start">{agenda}</div>
              <div className="lg:justify-self-end lg:text-right">{deviceStatus}</div>
            </footer>
          </>
        ) : (
          <section className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-5xl px-2 py-6 sm:px-0">{center}</div>
          </section>
        )}
      </div>
    </main>
  );
}
