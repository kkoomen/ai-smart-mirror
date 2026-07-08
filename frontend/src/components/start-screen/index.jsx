import VoiceControl from "../voice-control";

export default function StartScreen() {
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.6em] text-white/45">mirror ai</p>
      <h1 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
        Welcome to Mirror AI
      </h1>
      <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
        Let&apos;s register your face
      </p>
      <VoiceControl prompt="Say: start registration" />
    </section>
  );
}
