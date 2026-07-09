import RegistrationFlow from "../registration-flow";
import { useTranslation } from "react-i18next";

export default function RegistrationCenter({ controller }) {
  const { t } = useTranslation();
  const { phase, capturedName, progress, statusText, scanVideoRef, scanFaceVisible } = controller;

  if (phase === "name") {
    return (
      <RegistrationFlow step="name" name={capturedName} progress={0} helperText={statusText} />
    );
  }

  if (phase === "nameConfirm") {
    return (
      <RegistrationFlow
        step="nameConfirm"
        name={capturedName}
        progress={0}
        helperText={statusText}
      />
    );
  }

  if (phase === "scan") {
    return (
      <RegistrationFlow
        step="scan"
        name={capturedName}
        progress={progress}
        helperText={statusText}
        videoRef={scanVideoRef}
        scanStatus={scanFaceVisible ? t("register.scan.faceDetected") : t("register.scan.waitingFace")}
      />
    );
  }

  if (phase === "confirm") {
    return (
      <RegistrationFlow
        step="confirm"
        name={capturedName}
        progress={100}
        helperText={statusText}
      />
    );
  }

  return null;
}
