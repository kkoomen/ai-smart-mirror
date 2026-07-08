import VoiceControl from "../voice-control";

const steps = [
  { label: "listening for name", active: true },
  { label: "face scan simulation", active: false },
  { label: "confirmation step", active: false }
];

export default function RegistrationFlow() {
  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.6em] text-white/45">registration</p>
      <h2 className="max-w-4xl text-3xl font-light tracking-[0.12em] sm:text-5xl">
        Registering your profile
      </h2>
      <div className="w-full max-w-2xl space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="flex items-center justify-between border-b border-white/10 pb-3 text-sm uppercase tracking-[0.28em]"
          >
            <span className={step.active ? "text-white" : "text-white/55"}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={step.active ? "text-white" : "text-white/55"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <VoiceControl prompt="Speak your name now" />
    </section>
  );
}
