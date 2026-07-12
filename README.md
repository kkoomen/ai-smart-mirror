# AI Smart Mirror

Smart mirror prototype featuring face recognition, speech interaction, weather, multilingual support and on-demand widgets (e.g., agenda and public transport).

![demo](./demo.jpg)

This project was made as part of the interview process I did for [Banrai](https://banrai.ai). Below is additional info as requested in the assignment:
- **Implementation Method:** A (hardware simulation)
- **Target users:** Anyone who values a simpler and more efficient morning routine.
- **Usage scenarios:** Mostly during morning routines, but could be anytime when
  standing in front of the mirror.
- **Motivation:** Everyone has their morning routine, but many people share a big part of that:
  Check the weather to decide which outfit to wear, check the time to make sure you don't run behind schedule, check if your (public) transport has delay/malfunctions, check today's appointments. A smart mirror can save time by providing all this information while doing your morning routine.
- **Core value:** You might think what the value is since people already have a
  phone who can do the same thing through Text-to-Speech. However, the value
  lies in the fact that people value offline time, especially in the morning.
  Moreover, phones are distracting due to the many notifications users get,
  resulting in forgetting why they grabbed their phone in the first place.
- **User flow:** When saying `Hello mirror` it will detect the person's face standing in front of the mirror. If they don't have a profile in the database, they will be presented with a registration flow where they provide their name and scan their face. If their face is recognized, they are presented with the homepage with all their (personal) information. See [App Flow](#app-flow) for more details.
- **Key challenges:** During the implementation I thought asked myself the following questions:
  * **User flow:** What feels right? What minimum info do I need from users?
  * **Interface design:** What feels intuitive when doing your morning routime? What are necessary components to have?
  * **Speech Recognition:** Tested various ones (Native vs WASM/Transformer-based), but only the web based has low latency, hence this project is using the browser's native Web Speech API.
- **Crucial trade-offs:**
  * Web protoype instead of real hardware to focus on interaction and for simplicity.
  * Browser Speech API instead of existing libraries for a cost-free and fast implementation, since low latency is crucial for users.
  * Face recognition instead of speech recognition, since the user is already standing in front of the mirror. Requiring the user to speak is asking for an additional and unnecessary action.
  * SQLite instead of any other DB, since it requires zero config and suits minimal projects.
  * TypeScript instead of JavaScript to naturally reduce runtime errors, and this also helps the AI during vibe coding.
  * Fastify instead of Express as a faster alternative with better performance.
  * Cache the weather data for 6 hours instead of live fetching since the data doesn't change that frequently throughout the day.
  * Multilingual instead of English-only to remove language barriers, since English is not universal.
- **Role of AI tools:** Currently, only DeepSeek-Chat is utilized for (1) personalized summarization on the homepage and (2) speech intent detection as a replacement for manual pattern matching, allowing users to reply with natural language instead of fixed phrases.
- **Development time:** I spent a total of 18 hours on this project from start to finish, including unit tests.
- **AI usage:** Everything is vibe coded using [Codex](https://openai.com/codex/). At the start of the project, GPT-5.4-mini was used. At the end of the project when the project size scaled, GPT-5.4 was used, all medium reasoning.

# Table of Contents

- [AI Smart Mirror](#ai-smart-mirror)
- [Table of Contents](#table-of-contents)
- [Stack](#stack)
- [Structure](#structure)
- [Setup](#setup)
- [Environment](#environment)
- [Scripts](#scripts)
- [Tests](#tests)
- [App Flow](#app-flow)
- [Voice And Language](#voice-and-language)
- [Face Recognition](#face-recognition)
- [Weather](#weather)
- [API Endpoints](#api-endpoints)
- [Database](#database)

# Stack

- Frontend: React, Vite, CSS Modules, React Router, i18next, face-api.js
- Backend: Fastify, TypeScript, Prisma, SQLite
- APIs: REST only
- Voice: browser Web Speech API for recognition and browser Speech Synthesis for TTS
- AI: DeepSeek for intent routing and dashboard summary generation
- Weather: OpenWeather when configured, otherwise mock weather
- Public transport: NS Reisinformatie API when `NS_API_KEY` is configured

# Structure

- `frontend` - React mirror UI, voice control, face recognition, i18n, routes, CSS Modules
- `backend` - Fastify API, Prisma schema, route modules, AI/weather modules, mock data, weather cache
- `backend/prisma` - SQLite Prisma schema
- `frontend/public/models` - face-api.js model files

# Setup

1. Install dependencies from the root: `npm install`
2. Copy backend env defaults if needed: `cp backend/.env.example backend/.env`.
3. Copy frontend env defaults if needed: `cp frontend/.env.example frontend/.env`.
4. Push the Prisma schema: `npm run db:push`
5. Start both apps: `npm run dev`

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

# Environment

Backend `backend/.env`:

```bash
DATABASE_URL="file:./dev.db"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
OPENWEATHER_API_KEY=""
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"
NS_API_KEY=""
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
- `NS_API_KEY` is used by `/api/transport/ns` to fetch NS train trips. Without it, the transport widget cannot load live trips.

# Scripts

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

# Tests

Current test files in the repo:

- `backend/src/lib/dashboard-summary.test.ts` - dashboard summary generation and AI output cleanup
- `backend/src/lib/intent.test.ts` - intent parsing and voice intent behavior
- `backend/src/routes/mirror.test.ts` - mirror route wiring and request handling
- `backend/src/routes/users.test.ts` - user route validation and language updates
- `backend/src/routes/voice.test.ts` - voice route validation and response mapping
- `backend/src/routes/public-transport.test.ts` - NS transport route validation and response mapping
- `backend/src/routes/weather.test.ts` - weather route validation and defaults
- `backend/src/weather/normalize-weather.test.ts` - weather normalization logic
- `backend/src/weather/weather-cache.test.ts` - weather cache hit, miss, expiry, and persistence
- `frontend/src/controllers/use-mirror-voice.test.ts` - mirror voice command decision flow
- `frontend/src/state/mirror-reducer.test.ts` - mirror reducer state transitions

Run all tests with:

```bash
npm run test
```

# App Flow

- The mirror starts idle on a black screen while camera and microphone remain available.
- Say `hello/hey/hi mirror` to wake it.
- If no user exists, the mirror shows the welcome screen where the user can register their name and face.
- Registration captures the user's name by voice, confirms the name, scans the face with webcam, stores the face descriptor, and creates the first user.
- After recognition, the mirror says `Hello <name>`, then shows weather, time, agenda, and device status.
- The center summary is generated from weather and appointment count, spoken with TTS.
- The bottom-left widget defaults to agenda. Voice commands can replace it with agenda or commute information.
- Say `show my agenda` to show agenda.
- Say `show my travel info` to show the public transport widget (using Dutch NS API).
- Say something like `I want to change language` from the dashboard to switch between English and Mandarin by voice.
- Say `goodbye/bye mirror` to return to idle mode. After 30 seconds, if the user is not detected in front of the camera anymore, idle mode will automatically toggle.

# Voice And Language

Text-to-speech uses configured browser voices:

- English: `Google US English (en-US)`
- Mandarin: `Google 普通话（中国大陆）（zh-CN)`

# Face Recognition

The frontend uses `face-api.js` in the browser.

- Run `npm run models:download` before testing face recognition.
- Models are stored under `frontend/public/models`.
- The default model URL is `/models`.
- Webcam permission is required.
- Registration stores the generated `faceLabel` and captured face descriptor in SQLite.
- Detection is limited to faces inside the on-screen oval during face scanning.
- After the dashboard is visible, the app periodically checks presence and fades out if the active user is no longer detected.

# Weather

- `GET /api/weather?location=Amsterdam` returns weather for a location.
- If `OPENWEATHER_API_KEY` exists, the backend calls OpenWeather.
- If no key exists or OpenWeather fails, mock weather is returned.
- Weather responses are cached in SQLite for 6 hours per normalized location.
- Users default to location `Amsterdam`.

# API Endpoints

Mirror:

- `POST /api/mirror/register-user` - creates a user, stores face data, and seeds mock agenda data
- `POST /api/mirror/dashboard-summary` - uses DeepSeek to generate a one-line weather and appointment summary

Users:

- `GET /api/users` - lists registered users
- `GET /api/users/:id/agenda/today` - returns today's agenda for a user
- `POST /api/users/:id/language` - updates `preferredLanguage` to `en` or `zh`

Weather:

- `GET /api/weather?location=Amsterdam` - returns current weather and short forecast

Public transport:

- `GET /api/transport/ns?userId=1` - returns the next 3 NS trips for the user's saved route

Voice:

- `POST /api/voice/command` - classifies a transcript into a mirror intent

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
- `SHOW_WIDGET`
- `GET_AGENDA`
- `GET_WEATHER`
- `UNKNOWN`

# Database

Primary models:

- `User` - name, face label, face descriptor, location, commute stations, preferred language
- `CalendarEvent` - agenda events per user
- `WeatherCache` - cached weather payloads by location

Use `npm run db:reset` when you want to clear local users and test the first-user registration flow again.
