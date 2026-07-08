import FadeTransition from "../fade-transition";
import CameraPreview from "../camera-preview";

const stepLabels = {
  name: "How can I call you?",
  nameConfirm: "Name confirmation",
  scan: "Face scan",
  confirm: "Confirmation step"
};

export default function RegistrationFlow({
  step,
  name,
  progress,
  helperText,
  videoRef,
  scanStatus,
}) {
  const currentLabel = stepLabels[step];

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <FadeTransition transitionKey={step} className="flex w-full flex-col items-center gap-6 text-center">
        <h2 className="max-w-4xl text-3xl font-light tracking-[0.12em] sm:text-5xl">
          {currentLabel}
        </h2>

        {step === "scan" ? (
          <div className="flex w-full max-w-2xl flex-col gap-4">
            <CameraPreview videoRef={videoRef} progress={progress} statusText={scanStatus} />
            <div className="space-y-1 text-sm uppercase tracking-[0.25em] text-white/65">
              <p>Look at the mirror</p>
              <p>Scanning face...</p>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-white/65">
              I recognized this face as {name}. Is that correct?
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Say: yes, no, or try again
            </p>
          </div>
        ) : null}

        {step === "nameConfirm" ? (
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-white/65">
              Is "{name}" your name?
            </p>
            <p className="pt-2 text-xs uppercase tracking-[0.3em] text-white/40">
              Say: Yes or no
            </p>
          </div>
        ) : null}

        {step === "name" ? (
          <p className="text-sm uppercase tracking-[0.25em] text-white/65">
            Say your name
          </p>
        ) : null}
        {step !== "name" && step !== "nameConfirm" ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/45">{helperText}</p>
        ) : null}
      </FadeTransition>
    </section>
  );
}
