export default function MirrorCenter({ controller }) {
  const { phase, registeredUser } = controller;

  if (phase === "hello") {
    return (
      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          Hello {registeredUser?.name ?? "Mirror user"}
        </h2>
      </section>
    );
  }

  if (phase === "unknown") {
    return (
      <section className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          Welcome
        </h2>
        <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
          Say: start registration
        </p>
      </section>
    );
  }

  return null;
}
