import { useEffect } from "react";
import i18n from "../../../i18n";
import { normalizeLanguage } from "../../../i18n/languages";
import { getMirrorState } from "../../../api/mirror";
import { getUsers } from "../../../api/users";
import type { MirrorBootstrapOptions } from "../../../types/mirror-controller";
import { getSpeechPrompt } from "../../../utils/speech-prompts";

export const useMirrorBootstrap = ({
  browserFaceService,
  bootstrapActions,
  speakText
}: MirrorBootstrapOptions) => {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        try {
          await browserFaceService.load();
        } catch {}

        const [mirrorState, usersResponse] = await Promise.all([
          getMirrorState(),
          getUsers()
        ]);

        bootstrapActions.loadKnownUsers(usersResponse.users);

        if (usersResponse.users.length === 0) {
          bootstrapActions.enterIdle();
          return;
        }

        if (mirrorState.activeUser && !mirrorState.registrationComplete) {
          await i18n.changeLanguage(normalizeLanguage(mirrorState.activeUser.preferredLanguage));
          bootstrapActions.restoreRegistrationUser(mirrorState.activeUser);
          speakText(
            getSpeechPrompt(
              "confirmName",
              normalizeLanguage(mirrorState.activeUser.preferredLanguage),
              { name: mirrorState.activeUser.name }
            ),
            normalizeLanguage(mirrorState.activeUser.preferredLanguage)
          );
          return;
        }

        if (mirrorState.registrationComplete && mirrorState.activeUser) {
          await i18n.changeLanguage(normalizeLanguage(mirrorState.activeUser.preferredLanguage));
          bootstrapActions.enterIdle();
          return;
        }

        bootstrapActions.enterIdle();
      } catch {
        bootstrapActions.failBootstrap();
      }
    };

    void bootstrap();
  }, [bootstrapActions, browserFaceService, speakText]);
};
