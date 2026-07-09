import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { subscribeToVoiceListenerState } from "../../utils/voice-listener";

const defaultLevels = [0.28, 0.55, 0.8, 0.55, 0.28];

export default function VoiceActivityIndicator({ visible = true }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [levels, setLevels] = useState(defaultLevels);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(
    () =>
      subscribeToVoiceListenerState((state) => {
        setIsEnabled(state.isEnabled);
      }),
    []
  );

  useEffect(() => {
    if (!isEnabled || !navigator.mediaDevices?.getUserMedia) {
      setLevels(defaultLevels);
      return;
    }

    let cancelled = false;

    const startAudioMeter = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
          mediaStreamRef.current = stream;
          return;
        }

        const audioContext = new AudioContextCtor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);

        mediaStreamRef.current = stream;
        audioContextRef.current = audioContext;

        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(frequencyData);

          const bandSize = Math.max(1, Math.floor(frequencyData.length / 5));
          const nextLevels = defaultLevels.map((fallbackLevel, index) => {
            const start = index * bandSize;
            const end = Math.min(frequencyData.length, start + bandSize);
            const band = frequencyData.slice(start, end);
            const average = band.reduce((sum, value) => sum + value, 0) / Math.max(1, band.length);
            const normalized = Math.min(1, Math.max(0.18, average / 110));

            return Math.max(fallbackLevel, normalized);
          });

          setLevels(nextLevels);
          animationFrameRef.current = window.requestAnimationFrame(tick);
        };

        tick();
      } catch {
        setLevels(defaultLevels);
      }
    };

    void startAudioMeter();

    return () => {
      cancelled = true;

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;

      void audioContextRef.current?.close();
      audioContextRef.current = null;
      setLevels(defaultLevels);
    };
  }, [isEnabled]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        "pointer-events-none fixed bottom-[25vh] left-1/2 z-50 flex h-12 -translate-x-1/2 items-center gap-1.5 transition-opacity duration-500",
        isEnabled ? "opacity-70" : "opacity-20"
      ].join(" ")}
      aria-hidden="true"
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={styles["voice-bar"]}
          style={{
            height: `${Math.round(10 + level * 30)}px`
          }}
        />
      ))}
    </div>
  );
}
