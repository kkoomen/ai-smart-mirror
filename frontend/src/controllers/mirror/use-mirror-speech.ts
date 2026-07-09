import { useCallback, useEffect } from "react";
import i18n from "../../i18n";
import { normalizeLanguage, type AppLanguage } from "../../i18n/languages";
import { preloadSpeech, speakText as speakBrowserText, type SpeakTextOptions } from "../../utils/speech";

export const useMirrorSpeech = () => {
  useEffect(() => {
    preloadSpeech();
  }, []);

  return useCallback(
    (text: string, language?: AppLanguage, interrupt = true, options?: SpeakTextOptions) => {
      speakBrowserText(
        text,
        language ?? normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
        interrupt,
        options
      );
    },
    [i18n.language, i18n.resolvedLanguage]
  );
};
