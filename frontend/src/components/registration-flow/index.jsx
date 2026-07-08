import VoiceControl from "../voice-control";
import CameraPreview from "../camera-preview";

const stepLabels = {
  name: "Listening for name",
  scan: "Face scan",
  confirm: "Confirmation step"
};

export default function RegistrationFlow({
  step,
  name,
  progress,
  onCommand,
  helperText,
  videoRef,
  scanStatus,
  detectedFaceLabel
}) {
  const currentLabel = stepLabels[step];

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.6em] text-white/45">registration</p>
      <h2 className="max-w-4xl text-3xl font-light tracking-[0.12em] sm:text-5xl">
        {currentLabel}
      </h2>

      {step === "scan" ? (
        <div className="flex w-full max-w-2xl flex-col gap-4">
          <CameraPreview
            videoRef={videoRef}
            progress={progress}
            statusText={scanStatus}
            detectedFaceLabel={detectedFaceLabel}
          />
          <div className="space-y-1 text-sm uppercase tracking-[0.25em] text-white/65">
            <p>Look at the mirror</p>
            <p>Scanning face...</p>
            <p>{scanStatus}</p>
          </div>
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-white/65">
            I recognized this face as {name}. Is that correct?
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Say: yes, confirm, no, or try again
          </p>
        </div>
      ) : null}

      {step === "name" ? (
        <p className="text-sm uppercase tracking-[0.25em] text-white/65">
          What is your name?
        </p>
      ) : null}

      <div className="w-full">
        <VoiceControl
          prompt={currentLabel}
          onCommand={onCommand}
          helperText={helperText}
          disabled={step === "scan"}
        />
      </div>
    </section>
  );
}
