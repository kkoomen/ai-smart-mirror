import type {
  FaceRecognitionResult,
  FaceRecognitionService,
  FaceRecognitionSnapshot
} from "./FaceRecognitionService";

const randomDigits = () => Math.floor(100 + Math.random() * 900);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

export class SimulatedFaceRecognitionService implements FaceRecognitionService {
  // TODO: Swap this out for face-api.js detection once browser-based face landmarks are available.
  async load() {
    return;
  }

  async startCamera() {
    return;
  }

  stopCamera() {
    return;
  }

  generateFaceLabel(name: string) {
    const slug = slugify(name) || "guest";
    return `face_${slug}_${randomDigits()}`;
  }

  async detectFace(snapshot: FaceRecognitionSnapshot): Promise<FaceRecognitionResult> {
    const { mode, knownUsers, activeUser } = snapshot;

    if (mode === "no_person" || knownUsers.length === 0) {
      return {
        detectedFaceLabel: null,
        matchedUser: null,
        confidence: 0,
        faceDescriptor: null,
        faceBox: null,
        isFaceDetected: false,
        source: "simulated"
      };
    }

    if (mode === "registered_user") {
      const matchedUser = activeUser ?? knownUsers[0] ?? null;

      if (!matchedUser) {
        return {
          detectedFaceLabel: null,
          matchedUser: null,
          confidence: 0,
          faceDescriptor: null,
          faceBox: null,
          isFaceDetected: false,
          source: "simulated"
        };
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
        source: "simulated"
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
      source: "simulated"
    };
  }
}
