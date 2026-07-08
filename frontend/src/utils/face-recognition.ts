import type { FaceRecognitionSubject } from "../types/face-recognition";
import type { User } from "../types/user";

export const toSubject = (user: User): FaceRecognitionSubject => ({
  id: user.id,
  name: user.name,
  faceLabel: user.faceLabel,
  faceDescriptor: user.faceDescriptor
});
