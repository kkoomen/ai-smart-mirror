import { useTranslation } from "react-i18next";
import { supportedLanguages } from "../../i18n/languages";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-white/55">
      <span className="hidden sm:inline">{t("languages.label")}</span>
      <div className="flex items-center gap-1 border border-white/10 bg-black/40 px-1 py-1 backdrop-blur-sm">
        {supportedLanguages.map((language) => {
          const active = (i18n.resolvedLanguage ?? i18n.language).startsWith(language.code);

          return (
            <button
              key={language.code}
              type="button"
              onClick={() => void i18n.changeLanguage(language.code)}
              className={[
                "min-w-12 px-2 py-1 transition-colors",
                active ? "bg-white text-black" : "text-white/70 hover:text-white"
              ].join(" ")}
            >
              {t(language.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
