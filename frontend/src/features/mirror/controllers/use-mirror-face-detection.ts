import { useEffect } from "react";
import i18n from "../../../i18n";
import { normalizeLanguage } from "../../../i18n/languages";
import { dashboardPresenceTimeoutMs } from "../../../constants";
import type { MirrorFaceDetectionOptions } from "../../../types/mirror-controller";
import { toSubject } from "../../../utils/face-recognition";

export const useMirrorFaceDetection = ({
  faceDetectionActions,
  loadDashboardData,
  createUserAndConfirm,
  capturedName,
  knownUsers,
  phase,
  scanVideoRef,
  idleVideoRef,
  wakeStartedAtRef,
  registrationCompletingRef,
  browserFaceService,
  speakText
}: MirrorFaceDetectionOptions) => {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    const scanProgressDecayStep = 3;
    const getScanProgressStep = () => Math.floor(Math.random() * 10) + 3;
    const delayMs =
      phase === "dashboard"
        ? dashboardPresenceTimeoutMs
        : phase === "scan" || phase === "waking"
          ? 300
          : 1000;
    const activeVideoRef = phase === "scan" ? scanVideoRef : idleVideoRef;

    const scheduleNext = () => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void runDetection().catch((error) => {
          if (!cancelled) {
            console.error("Face detection failed", error);
          }
        });
      }, delayMs);
    };

    const runDetection = async () => {
      const video = activeVideoRef.current;
      if (video) {
        if (phase === "scan") {
          browserFaceService.stopCamera(idleVideoRef.current);
        }

        await browserFaceService.startCamera(video);
      }

      if (phase !== "scan" && phase !== "waking" && phase !== "dashboard") {
        scheduleNext();
        return;
      }

      const detection = await browserFaceService.detectFace({
        knownUsers: knownUsers.map(toSubject),
        video
      });

      if (cancelled) {
        return;
      }

      if (phase === "scan") {
        faceDetectionActions.setScanFaceVisible(detection.isFaceDetected);

        if (detection.faceDescriptor) {
          faceDetectionActions.captureFaceDescriptor(detection.faceDescriptor);
        }

        if (detection.isFaceDetected) {
          faceDetectionActions.updateScanProgress((current) => {
            const next = Math.min(100, current + getScanProgressStep());

            if (current < 100 && next >= 100 && !registrationCompletingRef.current) {
              console.info("[Mirror registration] scan reached completion threshold", {
                current,
                next,
                hasFaceDescriptor: Boolean(detection.faceDescriptor),
                capturedName
              });
              registrationCompletingRef.current = true;
              faceDetectionActions.setStatus({ key: "status.completingRegistration" });
              window.setTimeout(() => {
                console.info("[Mirror registration] starting completion flow");

                void createUserAndConfirm(
                  capturedName || "Mirror user",
                  detection.faceDescriptor
                ).catch(() => {
                  registrationCompletingRef.current = false;
                  faceDetectionActions.setStatus({
                    key: "status.registrationFailed"
                  });
                  faceDetectionActions.resetToScan();
                });
              }, 250);
            }

            return next;
          });
        } else {
          faceDetectionActions.updateScanProgress((current) =>
            Math.max(0, current - scanProgressDecayStep)
          );
        }

        scheduleNext();
        return;
      }

      if (phase === "waking") {
        const matchedUser = knownUsers.find(
          (user) => user.faceLabel === detection.matchedUser?.faceLabel
        );

        if (matchedUser) {
          await i18n.changeLanguage(normalizeLanguage(matchedUser.preferredLanguage));
          faceDetectionActions.completeWake(matchedUser);
          await loadDashboardData(matchedUser.id, matchedUser.location);
          return;
        }

        const wakeStartedAt = wakeStartedAtRef.current ?? Date.now();
        const wakeTimedOut = Date.now() - wakeStartedAt > 3000;

        if (detection.isFaceDetected || wakeTimedOut) {
          faceDetectionActions.markUnknownUser();
          return;
        }

        scheduleNext();
        return;
      }
    };

    void runDetection().catch((error) => {
      if (!cancelled) {
        console.error("Face detection failed", error);
      }
    });

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (phase === "scan") {
        browserFaceService.stopCamera(activeVideoRef.current);
      }
    };
  }, [
    browserFaceService,
    capturedName,
    idleVideoRef,
    knownUsers,
    phase,
    registrationCompletingRef,
    scanVideoRef,
    faceDetectionActions,
    wakeStartedAtRef,
    speakText
  ]);
};
