import { useTranslation } from "react-i18next";

type DeviceStatusProps = {
  camera: "scanning" | "polling";
  microphone: "listening";
  network: "connected";
  battery: string;
};

export default function DeviceStatus({ camera, microphone, network, battery }: DeviceStatusProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <p className="text-xs uppercase tracking-[0.5em] text-white/45">{t("device.title")}</p>
      <div className="space-y-2 text-sm uppercase tracking-[0.3em] text-white/75 lg:text-right">
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
