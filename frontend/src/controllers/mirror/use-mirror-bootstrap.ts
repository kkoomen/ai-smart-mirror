import { useEffect } from "react";
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
        try {
          await browserFaceService.load();
        } catch {}

        const [mirrorState, usersResponse] = await Promise.all([
          requestJson<MirrorStateResponse>("/api/mirror/state"),
          requestJson<UsersResponse>("/api/users")
        ]);

        setKnownUsers(usersResponse.users);

        if (usersResponse.users.length === 0) {
          setPhase("idle");
          setStatusText({ key: "status.sayHeyMirrorToWake" });
          return;
        }

        if (mirrorState.activeUser && !mirrorState.registrationComplete) {
          setRegisteredUser(mirrorState.activeUser);
          setCapturedName(mirrorState.activeUser.name);
          setCapturedFaceLabel(mirrorState.activeUser.faceLabel);
          setCapturedFaceDescriptor(mirrorState.activeUser.faceDescriptor);
          setPhase("nameConfirm");
          setStatusText({ key: "register.flow.yesNoTryAgain" });
          return;
        }

        if (mirrorState.registrationComplete && mirrorState.activeUser) {
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
