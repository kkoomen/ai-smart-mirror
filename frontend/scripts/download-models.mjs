import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const modelsDir = path.join(projectRoot, "public", "models");

const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2"
];

const baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

await mkdir(modelsDir, { recursive: true });

for (const file of files) {
  const url = `${baseUrl}/${file}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${file}: ${response.status} ${response.statusText}`);
  }

  const targetPath = path.join(modelsDir, file);
  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, data);
  console.log(`Downloaded ${file}`);
}

console.log(`Face-api.js models saved to ${modelsDir}`);
