import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "../../hooks/use-speech-recognition";
import styles from "./styles.module.css";

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
    <section className={styles.root}>
      <div className={styles.header}>
        <p className={styles.title}>{t("voice.control")}</p>
        <span className={styles.state}>
          {t(`voice.states.${voiceState}`)}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.prompt}>
          {prompt}
        </div>
        <p className={styles.helper}>{helperText}</p>
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        {!isSupported ? (
          <p className={styles.unsupported}>
            {t("voice.errors.notSupported")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
