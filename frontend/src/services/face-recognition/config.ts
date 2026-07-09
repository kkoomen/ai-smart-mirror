export const faceRecognitionConfig = {
  modelUrl: import.meta.env.VITE_FACE_API_MODEL_URL ?? "/models",
  faceDistanceThreshold: 0.52,
  tinyFaceDetectorOptions: {
    inputSize: 224,
    scoreThreshold: 0.7
  },
  cameraConstraints: {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  },
  scanOvalBounds: {
    xRatio: 0.29,
    yRatio: 0.11,
    widthRatio: 0.42,
    heightRatio: 0.78
  }
} as const satisfies {
  modelUrl: string;
  faceDistanceThreshold: number;
  tinyFaceDetectorOptions: {
    inputSize: number;
    scoreThreshold: number;
  };
  cameraConstraints: MediaStreamConstraints;
  scanOvalBounds: {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;
  };
};
