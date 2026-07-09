# AI Smart Mirror

A full-stack TypeScript smart mirror prototype. The frontend simulates a mirror-glass UI with a black screen, white text, webcam face recognition, browser speech recognition, browser text-to-speech, and multilingual English/Mandarin support. The backend stores users, face descriptors, agenda data, voice command logs, mirror state, and cached weather in SQLite.

![demo](./demo.jpg)

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, i18next, face-api.js
- Backend: Fastify, TypeScript, Prisma, SQLite
- APIs: REST only
- Voice: browser Web Speech API for recognition and browser Speech Synthesis for TTS
- AI: DeepSeek for intent routing and dashboard summary generation
- Weather: OpenWeather when configured, otherwise mock weather

## Structure

- `frontend` - React mirror UI, voice control, face recognition, i18n, routes
- `backend` - Fastify API, Prisma schema, route modules, mock data, weather cache
- `backend/prisma` - SQLite Prisma schema
- `frontend/public/models` - face-api.js model files

## Setup

1. Install dependencies from the root.
2. Copy backend env defaults if needed: `cp backend/.env.example backend/.env`.
3. Copy frontend env defaults if needed: `cp frontend/.env.example frontend/.env`.
4. Download face-api.js models.
5. Push the Prisma schema.
6. Start both apps.

```bash
npm install
npm run models:download
npm run db:push
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Environment

Backend `backend/.env`:

```bash
DATABASE_URL="file:./dev.db"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
OPENWEATHER_API_KEY=""
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"
```

Frontend `frontend/.env`:

```bash
VITE_API_URL="http://localhost:3001"
VITE_FACE_API_MODEL_URL="/models"
```

Notes:

- `OPENWEATHER_API_KEY` is optional. Without it, the backend returns mock weather.
- Weather is cached in SQLite for 6 hours per location.
- `DEEPSEEK_API_KEY` is used for intent classification and dashboard summaries.

## Scripts

- `npm run dev` - run frontend and backend together
- `npm run dev:frontend` - run the frontend only
- `npm run dev:backend` - run the backend only
- `npm run build` - build both apps
- `npm run build:frontend` - build the frontend only
- `npm run build:backend` - build the backend only
- `npm run typecheck` - run frontend and backend TypeScript checks
- `npm run lint` - run ESLint
- `npm run test` - run Vitest tests
- `npm run format` - format the repository with Prettier
- `npm run format:check` - check Prettier formatting
- `npm run check` - run typecheck, lint, tests, and format check
- `npm run models:download` - download face-api.js models into `frontend/public/models`
- `npm run db:push` - create/update the SQLite schema
- `npm run db:reset` - clear local SQLite data and recreate the schema
- `npm run db:generate` - generate the Prisma client
- `npm run db:studio` - open Prisma Studio

## Repository Hygiene

- Local databases, env files, build output, `node_modules`, OS files, and local tool state are ignored.
- `demo.jpg` is intentionally tracked as the README preview image.
- `frontend/public/models` is intentionally tracked so face recognition works after install.

## App Flow

- The mirror starts idle on a black screen while camera and microphone remain available.
- Say `hello/hey/hi mirror` to wake it.
- If no user exists, the mirror shows the welcome screen where the user can register their name and face.
- Registration captures the user's name by voice, confirms it, scans the face with webcam, stores the face descriptor, and creates the first user.
- After recognition, the mirror says `Hello <name>`, then shows weather, time, agenda, and device status.
- The center summary is generated from weather and appointment count, spoken with TTS.
- Say something like `I want to change language` from the dashboard to switch between English and Mandarin by voice.
- Say `goodbye/bye mirror` to return to idle mode. After 30 seconds, if the user is not detected in front of the camera anymore, idle mode will automatically toggle.

## Voice And Language

Text-to-speech uses configured browser voices:

- English: `Google US English (en-US)`
- Mandarin: `Google 普通话（中国大陆）（zh-CN)`

## Face Recognition

The frontend uses `face-api.js` in the browser.

- Run `npm run models:download` before testing face recognition.
- Models are stored under `frontend/public/models`.
- The default model URL is `/models`.
- Webcam permission is required.
- Registration stores the generated `faceLabel` and captured face descriptor in SQLite.
- Detection is limited to faces inside the on-screen oval during face scanning.
- After the dashboard is visible, the app periodically checks presence and fades out if the active user is no longer detected.

## Weather

- `GET /api/weather?location=Amsterdam` returns weather for a location.
- If `OPENWEATHER_API_KEY` exists, the backend calls OpenWeather.
- If no key exists or OpenWeather fails, mock weather is returned.
- Weather responses are cached in SQLite for 6 hours per normalized location.
- Users default to location `Amsterdam`.

## API Endpoints

Mirror:

- `GET /api/mirror/state` - returns mirror mode, active user, user count, and registration status
- `POST /api/mirror/start-registration` - resets mirror state for registration
- `POST /api/mirror/register-user` - creates a user, stores face data, and seeds mock agenda data
- `POST /api/mirror/dashboard-summary` - uses DeepSeek to generate a one-line weather and appointment summary

Users:

- `GET /api/users` - lists registered users
- `GET /api/users/:id/agenda/today` - returns today's agenda for a user
- `POST /api/users/:id/language` - updates `preferredLanguage` to `en` or `zh`

Weather:

- `GET /api/weather?location=Amsterdam` - returns current weather and short forecast

Voice:

- `POST /api/voice/command` - classifies a transcript into a mirror intent and stores a command log

Supported voice intents:

- `WAKE_MIRROR`
- `SLEEP_MIRROR`
- `START_REGISTRATION`
- `CHANGE_LANGUAGE`
- `SET_LANGUAGE_EN`
- `SET_LANGUAGE_ZH`
- `PROVIDE_NAME`
- `CONFIRM_YES`
- `CONFIRM_NO`
- `GET_AGENDA`
- `GET_WEATHER`
- `UNKNOWN`

## Database

Primary models:

- `User` - name, face label, face descriptor, location, preferred language
- `CalendarEvent` - agenda events per user
- `VoiceCommandLog` - transcript, intent, response, optional user
- `MirrorState` - active user and registration completion
- `WeatherCache` - cached weather payloads by location

Use `npm run db:reset` when you want to clear local users and test the first-user registration flow again.
