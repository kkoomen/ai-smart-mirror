import { useEffect } from "react";
import type { Dispatch, MutableRefObject, RefObject } from "react";
import { dashboardPresenceTimeoutMs } from "../constants";
import type { BrowserFaceRecognitionService } from "../services/face-recognition";
import type { MirrorAction } from "../state/mirror-reducer";
import type { MirrorPhase } from "../types/mirror-phase";
import type { User } from "../types/user";
import { toSubject } from "../utils/face-recognition";

type DashboardPresenceOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  dispatch: Dispatch<MirrorAction>;
  idleVideoRef: RefObject<HTMLVideoElement | null>;
  knownUsers: User[];
  phase: MirrorPhase;
  registeredUser: User | null;
  dashboardPresenceTimerRef: MutableRefObject<number | null>;
};

export const useDashboardPresence = ({
  browserFaceService,
  dispatch,
  idleVideoRef,
  knownUsers,
  phase,
  registeredUser,
  dashboardPresenceTimerRef
}: DashboardPresenceOptions) => {
  useEffect(() => {
    if (phase !== "dashboard" || !registeredUser) {
      return;
    }

    let cancelled = false;
    dashboardPresenceTimerRef.current = window.setTimeout(async () => {
      if (cancelled) {
        return;
      }

      try {
        const detection = await browserFaceService.detectFace({
          knownUsers: knownUsers.map(toSubject),
          video: idleVideoRef.current
        });

        const activeFaceLabel = registeredUser.faceLabel;
        const matchedFaceLabel = detection.matchedUser?.faceLabel ?? null;

        if (!detection.isFaceDetected || matchedFaceLabel !== activeFaceLabel) {
          dispatch({ type: "PRESENCE_LOST" });
        }
      } catch (error) {
        console.error("Dashboard presence check failed", error);
      }
    }, dashboardPresenceTimeoutMs);

    return () => {
      cancelled = true;
      if (dashboardPresenceTimerRef.current !== null) {
        window.clearTimeout(dashboardPresenceTimerRef.current);
        dashboardPresenceTimerRef.current = null;
      }
    };
  }, [
    browserFaceService,
    dashboardPresenceTimerRef,
    dispatch,
    idleVideoRef,
    knownUsers,
    phase,
    registeredUser
  ]);
};
