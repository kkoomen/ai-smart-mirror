import { useTranslation } from "react-i18next";

export default function MirrorCenter({ controller }) {
  const { t } = useTranslation();
  const { phase, registeredUser } = controller;

  if (phase === "hello") {
    return (
      <section className="flex flex-col items-center gap-4 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          {t("status.hello", { name: registeredUser?.name ?? t("home.mirror.defaultUser") })}
        </h2>
      </section>
    );
  }

  if (phase === "unknown") {
    return (
      <section className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
          {t("home.mirror.welcome")}
        </h2>
        <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
          {t("home.mirror.startRegistration")}
        </p>
      </section>
    );
  }

  return null;
}
