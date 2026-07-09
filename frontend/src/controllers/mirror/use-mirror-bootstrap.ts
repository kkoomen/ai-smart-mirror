import { useEffect } from "react";
import i18n from "../../i18n";
import { normalizeLanguage } from "../../i18n/languages";
import type { MirrorBootstrapOptions } from "../../types/mirror-controller";
import { getSpeechPrompt } from "../../utils/speech-prompts";
import { getMirrorState } from "../../api/mirror";
import { getUsers } from "../../api/users";

export const useMirrorBootstrap = ({
  browserFaceService,
  setKnownUsers,
  setRegisteredUser,
  setCapturedName,
  setCapturedFaceLabel,
  setCapturedFaceDescriptor,
  setPhase,
  setStatusText,
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

        setKnownUsers(usersResponse.users);

        if (usersResponse.users.length === 0) {
          setPhase("idle");
          setStatusText({ key: "status.sayHeyMirrorToWake" });
          return;
        }

        if (mirrorState.activeUser && !mirrorState.registrationComplete) {
          await i18n.changeLanguage(normalizeLanguage(mirrorState.activeUser.preferredLanguage));
          setRegisteredUser(mirrorState.activeUser);
          setCapturedName(mirrorState.activeUser.name);
          setCapturedFaceLabel(mirrorState.activeUser.faceLabel);
          setCapturedFaceDescriptor(mirrorState.activeUser.faceDescriptor);
          setPhase("nameConfirm");
          setStatusText({ key: "register.flow.yesNoTryAgain" });
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
          setRegisteredUser(null);
          setPhase("idle");
          setStatusText({ key: "status.sayHeyMirrorToWake" });
          return;
        }

        setPhase("idle");
        setStatusText({ key: "status.sayHeyMirrorToWake" });
      } catch {
        setPhase("idle");
        setStatusText({ key: "status.backendUnavailable" });
      }
    };

    void bootstrap();
  }, [
    browserFaceService,
    setCapturedFaceDescriptor,
    setCapturedFaceLabel,
    setCapturedName,
    setKnownUsers,
    setPhase,
    setRegisteredUser,
    setStatusText
  ]);
};
