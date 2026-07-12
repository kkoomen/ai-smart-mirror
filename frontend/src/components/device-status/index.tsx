import { useTranslation } from "react-i18next";
import styles from "./styles.module.css";

type DeviceStatusProps = {
  camera: "scanning" | "polling";
  microphone: "listening";
  network: "connected";
  battery: string;
};

export default function DeviceStatus({ camera, microphone, network, battery }: DeviceStatusProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.root}>
      <p className={styles.title}>{t("device.title")}</p>
      <div className={styles.items}>
        <div>
          {t("device.camera")}: {t(`device.status.${camera}`)}
        </div>
        <div>
          {t("device.microphone")}: {t(`device.status.${microphone}`)}
        </div>
        <div>
          {t("device.network")}: {t(`device.status.${network}`)}
        </div>
        <div>
          {t("device.battery")}: {battery}
        </div>
      </div>
    </section>
  );
}
