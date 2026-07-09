import { useTranslation } from "react-i18next";

export default function StartScreen() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.6em] text-white/45">{t("home.startScreen.eyebrow")}</p>
      <h1 className="max-w-4xl text-4xl font-light tracking-[0.12em] sm:text-6xl lg:text-7xl">
        {t("home.startScreen.title")}
      </h1>
      <p className="max-w-2xl text-sm uppercase tracking-[0.3em] text-white/65 sm:text-base">
        {t("home.startScreen.subtitle")}
      </p>
    </section>
  );
}
