import { useCallback } from "react";
import type { Dispatch, MutableRefObject, RefObject } from "react";
import i18n from "../../i18n";
import { normalizeLanguage, type AppLanguage } from "../../i18n/languages";
import { confirmMirrorFace, registerMirrorUser, startMirrorRegistration } from "../../api/mirror";
import type { MirrorAction } from "../../features/mirror/mirror-reducer";
import type { BrowserFaceRecognitionService } from "../../services/face-recognition";
import type { User } from "../../types/user";
import { toSubject } from "../../utils/face-recognition";
import { getSpeechPrompt } from "../../utils/speech-prompts";

type RegistrationFlowOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  capturedFaceDescriptor: string | null;
  capturedFaceLabel: string | null;
  dispatch: Dispatch<MirrorAction>;
  idleVideoRef: RefObject<HTMLVideoElement | null>;
  knownUsers: User[];
  loadDashboardData: (userId: number, location: string) => Promise<void>;
  navigate: (path: string) => void;
  registrationCompletingRef: MutableRefObject<boolean>;
  scanVideoRef: RefObject<HTMLVideoElement | null>;
  speakText: (text: string, language?: AppLanguage) => void;
};

export const useRegistrationFlow = ({
  browserFaceService,
  capturedFaceDescriptor,
  capturedFaceLabel,
  dispatch,
  idleVideoRef,
  knownUsers,
  loadDashboardData,
  navigate,
  registrationCompletingRef,
  scanVideoRef,
  speakText
}: RegistrationFlowOptions) => {
  const startRegistration = useCallback(async () => {
    await startMirrorRegistration();

    dispatch({ type: "REGISTRATION_STARTED" });
    registrationCompletingRef.current = false;
    navigate("/register");
  }, [dispatch, navigate, registrationCompletingRef]);

  const createUserAndConfirm = useCallback(
    async (name: string, faceDescriptorOverride?: string | null) => {
      const preferredLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
      const faceLabel = capturedFaceLabel ?? browserFaceService.generateFaceLabel(name);
      let faceDescriptor = faceDescriptorOverride ?? capturedFaceDescriptor;

      if (!faceDescriptor && (scanVideoRef.current || idleVideoRef.current)) {
        const fallbackVideo = scanVideoRef.current ?? idleVideoRef.current;
        const fallbackDetection = await browserFaceService.detectFace({
          knownUsers: knownUsers.map(toSubject),
          video: fallbackVideo
        });

        if (fallbackDetection.isFaceDetected && fallbackDetection.faceDescriptor) {
          faceDescriptor = fallbackDetection.faceDescriptor;
        }
      }

      if (!faceDescriptor) {
        throw new Error("No face descriptor captured. Please scan your face again.");
      }

      const created = await registerMirrorUser({
        name,
        faceLabel,
        faceDescriptor,
        preferredLanguage
      });

      const confirmed = await confirmMirrorFace({
        userId: created.user.id,
        faceLabel: created.user.faceLabel
      });

      dispatch({ type: "REGISTRATION_COMPLETED", user: confirmed.user });
      registrationCompletingRef.current = false;
      await loadDashboardData(confirmed.user.id, confirmed.user.location);
      navigate("/");
      speakText(
        getSpeechPrompt("hello", normalizeLanguage(confirmed.user.preferredLanguage), {
          name: confirmed.user.name
        }),
        normalizeLanguage(confirmed.user.preferredLanguage)
      );
    },
    [
      browserFaceService,
      capturedFaceDescriptor,
      capturedFaceLabel,
      dispatch,
      idleVideoRef,
      knownUsers,
      loadDashboardData,
      navigate,
      registrationCompletingRef,
      scanVideoRef,
      speakText
    ]
  );

  return {
    createUserAndConfirm,
    startRegistration
  };
};
