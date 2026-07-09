import * as faceapi from "face-api.js";
import type {
  FaceRecognitionResult,
  FaceRecognitionService,
  FaceRecognitionSnapshot,
  FaceRecognitionSubject
} from "../../types/face-recognition";
import { faceRecognitionConfig } from "./config";

const randomDigits = () => Math.floor(100 + Math.random() * 900);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

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

const isPlayInterruption = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

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
  private cameraStartPromises = new WeakMap<HTMLVideoElement, Promise<void>>();

  async load() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(faceRecognitionConfig.modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(faceRecognitionConfig.modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(faceRecognitionConfig.modelUrl)
    ]).then(() => {
      this.loaded = true;
    });

    return this.loadPromise;
  }

  async startCamera(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access is not available in this browser.");
    }

    const existingStartPromise = this.cameraStartPromises.get(video);
    if (existingStartPromise) {
      return existingStartPromise;
    }

    const existingStream = this.cameraStreams.get(video);
    if (existingStream) {
      if (video.paused) {
        try {
          await video.play();
        } catch (error) {
          if (!isPlayInterruption(error)) {
            throw error;
          }
        }
      }

      return;
    }

    const startPromise = navigator.mediaDevices
      .getUserMedia(faceRecognitionConfig.cameraConstraints)
      .then(async (stream) => {
        this.cameraStreams.set(video, stream);
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        try {
          await video.play();
        } catch (error) {
          if (!isPlayInterruption(error)) {
            throw error;
          }
        }
      })
      .finally(() => {
        this.cameraStartPromises.delete(video);
      });

    this.cameraStartPromises.set(video, startPromise);
    return startPromise;
  }

  stopCamera(video?: HTMLVideoElement | null) {
    if (!video) {
      return;
    }

    const stream = this.cameraStreams.get(video) ?? (video.srcObject as MediaStream | null);
    stream?.getTracks().forEach((track) => track.stop());
    this.cameraStreams.delete(video);
    this.cameraStartPromises.delete(video);

    if (video.srcObject) {
      video.pause();
      video.srcObject = null;
    }
  }

  generateFaceLabel(name: string) {
    const slug = slugify(name) || "guest";
    return `face_${slug}_${randomDigits()}`;
  }

  private buildNoFaceResult() {
    return {
      detectedFaceLabel: null,
      matchedUser: null,
      confidence: 0,
      faceDescriptor: null,
      faceBox: null,
      isFaceDetected: false
    } satisfies FaceRecognitionResult;
  }

  async detectFace(snapshot: FaceRecognitionSnapshot): Promise<FaceRecognitionResult> {
    if (!this.loaded) {
      return this.buildNoFaceResult();
    }

    const video = snapshot.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return this.buildNoFaceResult();
    }

    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions(faceRecognitionConfig.tinyFaceDetectorOptions)
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return this.buildNoFaceResult();
    }

    const { width: frameWidth, height: frameHeight } = getVideoDimensions(video);
    const box = detection.detection.box;
    const faceCenter = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
    const scanOvalBounds = faceRecognitionConfig.scanOvalBounds;
    const ovalBounds = {
      x: frameWidth * scanOvalBounds.xRatio,
      y: frameHeight * scanOvalBounds.yRatio,
      width: frameWidth * scanOvalBounds.widthRatio,
      height: frameHeight * scanOvalBounds.heightRatio
    };

    if (!isInsideEllipse(faceCenter, ovalBounds)) {
      return this.buildNoFaceResult();
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
        isFaceDetected: true
      };
    }

    const faceMatcher = new faceapi.FaceMatcher(
      labeledDescriptors,
      faceRecognitionConfig.faceDistanceThreshold
    );
    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    const matchedUser =
      snapshot.knownUsers.find((user) => user.faceLabel === bestMatch.label) ?? null;

    if (!matchedUser || bestMatch.label === "unknown") {
      return {
        detectedFaceLabel: `face_unmatched_${randomDigits()}`,
        matchedUser: null,
        confidence: 1 - bestMatch.distance,
        faceDescriptor,
        faceBox: box,
        isFaceDetected: true
      };
    }

    return {
      detectedFaceLabel: matchedUser.faceLabel,
      matchedUser,
      confidence: 1 - bestMatch.distance,
      faceDescriptor,
      faceBox: box,
      isFaceDetected: true
    };
  }
}
