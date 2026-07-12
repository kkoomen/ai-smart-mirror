import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import styles from "./styles.module.css";

type CameraPreviewProps = {
  videoRef?: RefObject<HTMLVideoElement | null>;
  progress: number;
  statusText?: string;
};

export default function CameraPreview({ videoRef, progress, statusText }: CameraPreviewProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.root}>
      <div className={styles.frame}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={styles.video}
        />

        <div className={styles.vignette} />
        <div className={styles.innerBorder} />

        <div className={styles.faceGuide} />

        <div className={styles.status}>
          <span>{t("device.camera")}</span>
          <span>{statusText}</span>
        </div>

        <div className={styles.progress}>
          <div className={styles.progressValue}>
            <span>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
