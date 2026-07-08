import { useEffect } from "react";
import { BrowserFaceRecognitionService } from "../../services/face-recognition";
import type { MirrorStateResponse } from "../../types/mirror";
import type { MirrorBootstrapOptions } from "../../types/mirror-controller";
import type { UsersResponse } from "../../types/api";
import { requestJson } from "../../utils/request-json";

export const useMirrorBootstrap = ({
  browserFaceService,
  setKnownUsers,
  setRegisteredUser,
  setCapturedName,
  setCapturedFaceLabel,
  setCapturedFaceDescriptor,
  setPhase,
  setStatusText
}: MirrorBootstrapOptions) => {
  useEffect(() => {
    const bootstrap = async () => {
      try {
        let faceApiReady = true;

        try {
          await browserFaceService.load();
        } catch {
          faceApiReady = false;
        }

        const [mirrorState, usersResponse] = await Promise.all([
          requestJson<MirrorStateResponse>("/api/mirror/state"),
          requestJson<UsersResponse>("/api/users")
        ]);

        setKnownUsers(usersResponse.users);

        if (usersResponse.users.length === 0) {
          setPhase("idle");
          setStatusText(
            faceApiReady
              ? "Say 'hey mirror' to wake"
              : "Face models are not loaded yet. Say 'hey mirror' to continue with voice mode."
          );
          return;
        }

        if (mirrorState.activeUser && !mirrorState.registrationComplete) {
          setRegisteredUser(mirrorState.activeUser);
          setCapturedName(mirrorState.activeUser.name);
          setCapturedFaceLabel(mirrorState.activeUser.faceLabel);
          setCapturedFaceDescriptor(mirrorState.activeUser.faceDescriptor);
          setPhase("nameConfirm");
          setStatusText("Say yes, no, or try again");
          return;
        }

        if (mirrorState.registrationComplete && mirrorState.activeUser) {
          setRegisteredUser(null);
          setPhase("idle");
          setStatusText("Say 'hey mirror' to wake");
          return;
        }

        setPhase("idle");
        setStatusText(
          faceApiReady
            ? "Say 'hey mirror' to wake"
            : "Face models are not loaded yet. Say 'hey mirror' to continue with voice mode."
        );
      } catch {
        setPhase("idle");
        setStatusText("Mirror backend unavailable");
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
