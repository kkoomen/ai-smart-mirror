import { useEffect, useState } from "react";
import styles from "./styles.module.css";
import { subscribeToVoiceListenerState } from "../../utils/voice-listener";

const indicatorNodes = [0, 1, 2, 3, 4];

type VoiceActivityIndicatorProps = {
  visible?: boolean;
};

export default function VoiceActivityIndicator({ visible = true }: VoiceActivityIndicatorProps) {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(
    () =>
      subscribeToVoiceListenerState((state) => {
        setIsEnabled(state.isEnabled);
      }),
    []
  );

  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        styles.root,
        isEnabled ? styles.enabled : styles.disabled
      ].join(" ")}
      aria-hidden="true"
    >
      {indicatorNodes.map((index) => (
        <span
          key={index}
          className={[
            styles["voice-node"],
            isEnabled ? styles["voice-node-speaking"] : styles["voice-node-idle"]
          ].join(" ")}
          style={isEnabled ? { animationDelay: `${index * 120}ms` } : undefined}
        />
      ))}
    </div>
  );
}
