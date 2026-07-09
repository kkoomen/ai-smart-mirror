import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "../../hooks/use-speech-recognition";

type VoiceControlProps = {
  prompt: string;
  onCommand: (transcript: string) => Promise<void>;
  helperText: string;
  disabled?: boolean;
  autoListen?: boolean;
  onTranscript?: (transcript: string) => void;
  visible?: boolean;
};

export default function VoiceControl({
  prompt,
  onCommand,
  helperText,
  disabled = false,
  autoListen = true,
  onTranscript,
  visible = true
}: VoiceControlProps) {
  const { t } = useTranslation();
  const { errorMessage, isSupported, voiceState } = useSpeechRecognition({
    autoListen,
    disabled,
    onCommand,
    onTranscript
  });

  if (!visible) {
    return null;
  }

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full max-w-2xl items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.55em] text-white/40">{t("voice.control")}</p>
        <span className="border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-white/70">
          {t(`voice.states.${voiceState}`)}
        </span>
      </div>

      <div className="w-full max-w-2xl space-y-3 text-center">
        <div className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80">
          {prompt}
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">{helperText}</p>
        {errorMessage ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">{errorMessage}</p>
        ) : null}
        {!isSupported ? (
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            {t("voice.errors.notSupported")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
