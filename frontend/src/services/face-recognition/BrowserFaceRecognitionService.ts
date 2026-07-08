import * as faceapi from "face-api.js";
import type {
  FaceRecognitionResult,
  FaceRecognitionService,
  FaceRecognitionSnapshot,
  FaceRecognitionSubject
} from "./FaceRecognitionService";

const randomDigits = () => Math.floor(100 + Math.random() * 900);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const DEFAULT_MODEL_URL = import.meta.env.VITE_FACE_API_MODEL_URL ?? "/models";
const FACE_DISTANCE_THRESHOLD = 0.52;

const parseDescriptor = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return new Float32Array(parsed as number[]);
  } catch {
    return null;
  }
};

const encodeDescriptor = (descriptor: Float32Array) => JSON.stringify(Array.from(descriptor));

const getVideoDimensions = (video: HTMLVideoElement) => {
  const width = video.videoWidth || video.clientWidth || 1;
  const height = video.videoHeight || video.clientHeight || 1;
  return { width, height };
};

const isInsideEllipse = (
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
) => {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  const normalizedX = (point.x - centerX) / radiusX;
  const normalizedY = (point.y - centerY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
};

export class BrowserFaceRecognitionService implements FaceRecognitionService {
  private loadPromise: Promise<void> | null = null;
  private loaded = false;
  private cameraStreams = new WeakMap<HTMLVideoElement, MediaStream>();

  async load() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(DEFAULT_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(DEFAULT_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(DEFAULT_MODEL_URL)
    ]).then(() => {
      this.loaded = true;
    });

    return this.loadPromise;
  }

  async startCamera(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not available in this browser.");
    }

    const existingStream = this.cameraStreams.get(video);
    if (existingStream) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    this.cameraStreams.set(video, stream);
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  stopCamera(video?: HTMLVideoElement | null) {
    if (!video) {
      return;
    }

    const stream = this.cameraStreams.get(video) ?? (video.srcObject as MediaStream | null);
    stream?.getTracks().forEach((track) => track.stop());
    this.cameraStreams.delete(video);

    if (video.srcObject) {
      video.pause();
      video.srcObject = null;
    }
  }

  generateFaceLabel(name: string) {
    const slug = slugify(name) || "guest";
    return `face_${slug}_${randomDigits()}`;
  }

  private buildNoFaceResult(source: "browser" | "simulated") {
    return {
      detectedFaceLabel: null,
      matchedUser: null,
      confidence: 0,
      faceDescriptor: null,
      faceBox: null,
      isFaceDetected: false,
      source
    } satisfies FaceRecognitionResult;
  }

  private buildSyntheticResult(
    snapshot: FaceRecognitionSnapshot,
    source: "browser" | "simulated"
  ): FaceRecognitionResult {
    const { mode, knownUsers, activeUser } = snapshot;

    if (mode === "no_person" || knownUsers.length === 0) {
      return this.buildNoFaceResult(source);
    }

    if (mode === "registered_user") {
      const matchedUser = activeUser ?? knownUsers[0] ?? null;

      if (!matchedUser) {
        return this.buildNoFaceResult(source);
      }

      return {
        detectedFaceLabel: matchedUser.faceLabel,
        matchedUser,
        confidence: 0.98,
        faceDescriptor: matchedUser.faceDescriptor,
        faceBox: {
          x: 220,
          y: 120,
          width: 180,
          height: 220
        },
        isFaceDetected: true,
        source
      };
    }

    const knownLabels = new Set(knownUsers.map((user) => user.faceLabel));
    let detectedFaceLabel = `face_unknown_${randomDigits()}`;

    while (knownLabels.has(detectedFaceLabel)) {
      detectedFaceLabel = `face_unknown_${randomDigits()}`;
    }

    return {
      detectedFaceLabel,
      matchedUser: null,
      confidence: 0.29,
      faceDescriptor: null,
      faceBox: {
        x: 96,
        y: 80,
        width: 112,
        height: 112
      },
      isFaceDetected: true,
      source
    };
  }

  async detectFace(snapshot: FaceRecognitionSnapshot): Promise<FaceRecognitionResult> {
    if (snapshot.mode !== "live") {
      return this.buildSyntheticResult(snapshot, "browser");
    }

    if (!this.loaded) {
      return this.buildNoFaceResult("browser");
    }

    const video = snapshot.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return this.buildNoFaceResult("browser");
    }

    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 224,
          scoreThreshold: 0.7
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return this.buildNoFaceResult("browser");
    }

    const { width: frameWidth, height: frameHeight } = getVideoDimensions(video);
    const box = detection.detection.box;
    const faceCenter = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
    const ovalBounds = {
      x: frameWidth * 0.29,
      y: frameHeight * 0.11,
      width: frameWidth * 0.42,
      height: frameHeight * 0.78
    };

    if (!isInsideEllipse(faceCenter, ovalBounds)) {
      return this.buildNoFaceResult("browser");
    }

    const faceDescriptor = encodeDescriptor(detection.descriptor);

    const labeledDescriptors: faceapi.LabeledFaceDescriptors[] = snapshot.knownUsers.flatMap(
      (user: FaceRecognitionSubject) => {
        const descriptor = parseDescriptor(user.faceDescriptor);
        if (!descriptor) {
          return [];
        }

        return [new faceapi.LabeledFaceDescriptors(user.faceLabel, [descriptor])];
      }
    );

    if (labeledDescriptors.length === 0) {
      return {
        detectedFaceLabel: `face_unmatched_${randomDigits()}`,
        matchedUser: null,
        confidence: detection.detection.score,
        faceDescriptor,
        faceBox: box,
        isFaceDetected: true,
        source: "browser"
      };
    }

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, FACE_DISTANCE_THRESHOLD);
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    const matchedUser = snapshot.knownUsers.find((user) => user.faceLabel === bestMatch.label) ?? null;

    if (!matchedUser || bestMatch.label === "unknown") {
      return {
        detectedFaceLabel: `face_unmatched_${randomDigits()}`,
        matchedUser: null,
        confidence: 1 - bestMatch.distance,
        faceDescriptor,
        faceBox: box,
        isFaceDetected: true,
        source: "browser"
      };
    }

    return {
      detectedFaceLabel: matchedUser.faceLabel,
      matchedUser,
      confidence: 1 - bestMatch.distance,
      faceDescriptor,
      faceBox: box,
      isFaceDetected: true,
      source: "browser"
    };
  }
}
