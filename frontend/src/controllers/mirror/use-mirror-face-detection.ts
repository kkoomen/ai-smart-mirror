import { useEffect } from "react";
import type { MirrorFaceDetectionOptions } from "../../types/mirror-controller";
import { dashboardPresenceTimeoutMs } from "../../constants";
import { toSubject } from "../../utils/face-recognition";

export const useMirrorFaceDetection = ({
  setProgress,
  setScanFaceVisible,
  setCapturedFaceDescriptor,
  setRegisteredUser,
  setPhase,
  setStatusText,
  loadDashboardData,
  createUserAndConfirm,
  capturedName,
  knownUsers,
  phase,
  scanVideoRef,
  idleVideoRef,
  wakeStartedAtRef,
  registrationCompletingRef,
  browserFaceService
}: MirrorFaceDetectionOptions) => {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    const delayMs =
      phase === "dashboard" ? dashboardPresenceTimeoutMs : phase === "scan" || phase === "waking" ? 300 : 1000;
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
        setScanFaceVisible(detection.isFaceDetected);

        if (detection.faceDescriptor) {
          setCapturedFaceDescriptor(detection.faceDescriptor);
        }

        if (detection.isFaceDetected) {
          setProgress((current) => {
            const next = Math.min(100, current + 18);

            if (current < 100 && next >= 100 && !registrationCompletingRef.current) {
              registrationCompletingRef.current = true;
              setStatusText("Completing registration");
              window.setTimeout(() => {
                if (cancelled) {
                  return;
                }

                void createUserAndConfirm(capturedName || "Mirror user", detection.faceDescriptor).catch(
                  (error) => {
                    registrationCompletingRef.current = false;
                    setStatusText(
                      error instanceof Error
                        ? error.message
                        : "Registration failed. Please try again."
                    );
                    setPhase("scan");
                  }
                );
              }, 250);
            }

            return next;
          });
        } else {
          setProgress((current) => Math.max(0, current - 12));
        }

        scheduleNext();
        return;
      }

      if (phase === "waking") {
        const matchedUser = knownUsers.find((user) => user.faceLabel === detection.matchedUser?.faceLabel);

        if (matchedUser) {
          setRegisteredUser(matchedUser);
          await loadDashboardData(matchedUser.id, matchedUser.location);
          setPhase("hello");
          setStatusText(`Hello ${matchedUser.name}`);
          return;
        }

        const wakeStartedAt = wakeStartedAtRef.current ?? Date.now();
        const wakeTimedOut = Date.now() - wakeStartedAt > 3000;

        if (detection.isFaceDetected || wakeTimedOut) {
          setPhase("unknown");
          setStatusText("Unknown user detected");
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
    setCapturedFaceDescriptor,
    setPhase,
    setProgress,
    setRegisteredUser,
    setScanFaceVisible,
    setStatusText,
    wakeStartedAtRef
  ]);
};
