export type FaceRecognitionSubject = {
  id: number;
  name: string;
  faceLabel: string;
  faceDescriptor: string | null;
};

export type FaceRecognitionResult = {
  detectedFaceLabel: string | null;
  matchedUser: FaceRecognitionSubject | null;
  confidence: number;
  faceDescriptor: string | null;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  isFaceDetected: boolean;
};

export type FaceRecognitionSnapshot = {
  knownUsers: FaceRecognitionSubject[];
  video: HTMLVideoElement | null;
};

export interface FaceRecognitionService {
  // TODO: Add face-api.js model hosting and enrollment UX polish once the core flow is stable.
  load(): Promise<void>;
  startCamera(video: HTMLVideoElement): Promise<void>;
  stopCamera(video?: HTMLVideoElement | null): void;
  generateFaceLabel(name: string): string;
  detectFace(snapshot: FaceRecognitionSnapshot): Promise<FaceRecognitionResult>;
}
