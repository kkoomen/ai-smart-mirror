import { useCallback } from "react";
import type { Dispatch, MutableRefObject, RefObject } from "react";
import i18n from "../../../i18n";
import { normalizeLanguage, type AppLanguage } from "../../../i18n/languages";
import { registerMirrorUser, startMirrorRegistration } from "../../../api/mirror";
import type { BrowserFaceRecognitionService } from "../../../services/face-recognition";
import type { User } from "../../../types/user";
import { toSubject } from "../../../utils/face-recognition";
import { getSpeechPrompt } from "../../../utils/speech-prompts";
import type { MirrorAction } from "../mirror-reducer";

type RegistrationFlowOptions = {
  browserFaceService: BrowserFaceRecognitionService;
  capturedFaceDescriptorRef: MutableRefObject<string | null>;
  capturedFaceLabelRef: MutableRefObject<string | null>;
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
  capturedFaceDescriptorRef,
  capturedFaceLabelRef,
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
      const faceLabel = capturedFaceLabelRef.current ?? browserFaceService.generateFaceLabel(name);
      let faceDescriptor = faceDescriptorOverride ?? capturedFaceDescriptorRef.current;

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

      console.info("[Mirror registration] creating user", {
        name,
        faceLabel,
        preferredLanguage
      });

      const created = await registerMirrorUser({
        name,
        faceLabel,
        faceDescriptor,
        preferredLanguage
      });

      console.info("[Mirror registration] user created", {
        userId: created.user.id,
        faceLabel: created.user.faceLabel
      });

      dispatch({ type: "REGISTRATION_COMPLETED", user: created.user });
      registrationCompletingRef.current = false;
      navigate("/");
      speakText(
        getSpeechPrompt("hello", normalizeLanguage(created.user.preferredLanguage), {
          name: created.user.name
        }),
        normalizeLanguage(created.user.preferredLanguage)
      );
      console.info("[Mirror registration] transitioned to home");
      void loadDashboardData(created.user.id, created.user.location).catch((error) => {
        console.error("Failed to load dashboard data after registration", error);
      });
    },
    [
      browserFaceService,
      capturedFaceDescriptorRef,
      capturedFaceLabelRef,
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
