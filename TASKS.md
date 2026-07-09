# Structural Improvement Backlog

This backlog captures maintainability, scalability, and readability improvements for the AI Smart Mirror codebase. Each task is intentionally scoped so it can be handled independently.

## 1. Rename `VoicePhase` To `MirrorPhase`

### Problem

`VoicePhase` currently represents the whole mirror UI/application state, not just voice state. It includes values like `idle`, `waking`, `hello`, `name`, `scan`, `dashboard`, and `unknown`.

This creates naming confusion because there is also a separate local voice recognition state in `VoiceControl` such as `idle`, `listening`, `thinking`, and `error`.

### Affected Files

- `frontend/src/types/voice.ts`
- `frontend/src/types/mirror-controller.ts`
- `frontend/src/hooks/use-mirror-controller.ts`
- `frontend/src/controllers/mirror/use-mirror-voice.ts`
- `frontend/src/controllers/mirror/use-mirror-face-detection.ts`
- `frontend/src/controllers/mirror/use-mirror-bootstrap.ts`
- Any component or page that imports `VoicePhase`

### Suggested Work

- Rename `VoicePhase` to `MirrorPhase`.
- Keep voice recognition state names separate, e.g. `VoiceRecognitionState`.
- Update imports and type references.
- Confirm there is no runtime behavior change.

### Acceptance Criteria

- No `VoicePhase` type remains unless it is truly voice-specific.
- Mirror phase and voice listener state are clearly separate.
- Frontend build passes.

---

## 2. Add Typed Frontend API Clients

### Problem

Frontend API calls are embedded directly in orchestration hooks. This mixes network transport details with mirror behavior.

Examples:

- `frontend/src/hooks/use-mirror-controller.ts` loads weather, agenda, dashboard summaries, registration, confirmation, and language persistence.
- `frontend/src/controllers/mirror/use-mirror-voice.ts` calls `/api/voice/command` directly.

### Affected Files

- `frontend/src/hooks/use-mirror-controller.ts`
- `frontend/src/controllers/mirror/use-mirror-voice.ts`
- `frontend/src/utils/request-json.ts`
- `frontend/src/types/api.ts`

### Suggested Work

Create API modules:

- `frontend/src/api/mirror.ts`
- `frontend/src/api/users.ts`
- `frontend/src/api/weather.ts`
- `frontend/src/api/voice.ts`

Example responsibilities:

- `startRegistration()`
- `registerUser(payload)`
- `confirmFace(payload)`
- `getMirrorState()`
- `getUsers()`
- `getAgendaToday(userId)`
- `getWeather(location)`
- `updateUserLanguage(userId, language)`
- `classifyVoiceCommand(payload)`
- `generateDashboardSummary(payload)`

### Acceptance Criteria

- Controllers no longer contain raw endpoint strings.
- API request/response types are imported from `frontend/src/types`.
- Existing behavior stays unchanged.
- Frontend build passes.

---

## 3. Convert Mirror Orchestration To A Reducer Or State Machine

### Problem

Mirror behavior is currently coordinated through many independent React state setters and phase checks. The main hook owns a large amount of state and transitions:

- `phase`
- captured registration data
- active user
- known users
- weather
- agenda
- fade state
- dashboard summary
- timers
- pending language change

This makes it easy to create impossible states, such as dashboard data existing while the mirror is idle, or registration fields leaking between flows.

### Affected Files

- `frontend/src/hooks/use-mirror-controller.ts`
- `frontend/src/controllers/mirror/use-mirror-voice.ts`
- `frontend/src/controllers/mirror/use-mirror-face-detection.ts`
- `frontend/src/types/mirror-controller.ts`

### Suggested Work

Create either:

- `frontend/src/features/mirror/mirror-reducer.ts`
- or `frontend/src/features/mirror/mirror-machine.ts`

Suggested event names:

- `BOOTSTRAP_STARTED`
- `BOOTSTRAP_SUCCEEDED`
- `BOOTSTRAP_FAILED`
- `WAKE_REQUESTED`
- `WAKE_FACE_MATCHED`
- `WAKE_FACE_UNKNOWN`
- `SLEEP_REQUESTED`
- `REGISTRATION_STARTED`
- `REGISTRATION_NAME_CAPTURED`
- `REGISTRATION_NAME_REJECTED`
- `REGISTRATION_SCAN_STARTED`
- `REGISTRATION_SCAN_PROGRESS_CHANGED`
- `REGISTRATION_SCAN_COMPLETED`
- `REGISTRATION_COMPLETED`
- `LANGUAGE_CHANGE_STARTED`
- `LANGUAGE_CHANGE_SELECTED`
- `LANGUAGE_CHANGE_COMPLETED`
- `DASHBOARD_DATA_LOADED`
- `PRESENCE_LOST`

### Acceptance Criteria

- Phase transitions happen through named events.
- Raw `setPhase(...)` calls are minimized or isolated.
- It is clear which transitions are valid from each state.
- Existing flows still work:
  - idle wake
  - first-user registration
  - recognized dashboard
  - unknown user
  - language change
  - goodbye/idle
  - presence timeout

---

## 4. Split `useMirrorController` Into Smaller Controllers

### Problem

`frontend/src/hooks/use-mirror-controller.ts` is a central orchestration hook. It owns too many responsibilities:

- app bootstrap
- face service setup
- registration state
- dashboard loading
- weather loading
- agenda loading
- summary generation
- language persistence
- speech preload and speaking
- presence timeout
- route navigation

This makes it harder to test and reason about changes.

### Suggested Work

Split responsibilities into focused hooks:

- `useMirrorBootstrap`
- `useRegistrationFlow`
- `useDashboardData`
- `useLanguageFlow`
- `usePresenceTimeout`
- `useSpeechController`
- `useMirrorStateMachine` or reducer wrapper

### Acceptance Criteria

- `useMirrorController` becomes a thin composition layer.
- Each extracted hook has a clear single responsibility.
- Existing controller return type remains stable for pages/components, or is migrated intentionally.
- Frontend build passes.

---

## 5. Replace Setter Injection With Intent-Level Actions

### Problem

Controller option types pass many raw setters into child hooks. For example, `MirrorVoiceOptions` includes setters for phase, status, captured name, face label, face descriptor, progress, scan visibility, fading state, and more.

This allows child hooks to mutate broad parent state directly, which increases coupling.

### Affected Files

- `frontend/src/types/mirror-controller.ts`
- `frontend/src/controllers/mirror/use-mirror-voice.ts`
- `frontend/src/controllers/mirror/use-mirror-face-detection.ts`
- `frontend/src/hooks/use-mirror-controller.ts`

### Suggested Work

Replace raw setters with domain actions:

- `registrationActions.start()`
- `registrationActions.captureName(name)`
- `registrationActions.rejectName()`
- `registrationActions.startScan()`
- `registrationActions.completeScan(descriptor)`
- `mirrorActions.wake()`
- `mirrorActions.sleep()`
- `mirrorActions.fadeOut()`
- `languageActions.begin(language)`
- `dashboardActions.loadForUser(user)`

### Acceptance Criteria

- Child hooks receive action objects, not many independent setters.
- Fewer implementation details leak between hooks.
- Voice handling reads as command-to-action mapping.

---

## 6. Extract Speech Recognition Into A Hook Or Service

### Problem

`frontend/src/components/voice-control/index.jsx` is a React component but also owns browser speech recognition lifecycle:

- feature detection
- recognition start/abort/restart
- TTS suppression
- transcript handling
- error handling
- global listener state publishing

This makes the UI component difficult to read and test.

### Suggested Work

Create:

- `frontend/src/hooks/use-speech-recognition.ts`

or:

- `frontend/src/features/voice/use-speech-recognition.ts`

Responsibilities:

- initialize recognition
- expose listener state
- pause during TTS
- restart after cooldown
- emit transcript events
- emit errors

Keep `VoiceControl` presentational.

### Acceptance Criteria

- `VoiceControl` mainly renders prompt/status/errors.
- Browser speech logic is reusable and testable.
- TTS suppression remains intact.
- Global voice activity indicator still works.

---

## 7. Add Backend Request Validation

### Problem

Backend route handlers manually cast `request.body` and validate values ad hoc. This is fragile and spreads validation logic across route files.

Examples:

- `backend/src/routes/mirror.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/voice.ts`
- `backend/src/routes/weather.ts`

### Suggested Work

Use one of:

- Fastify JSON schemas
- `zod`
- `@sinclair/typebox`

Suggested schema files:

- `backend/src/schemas/mirror.ts`
- `backend/src/schemas/users.ts`
- `backend/src/schemas/voice.ts`
- `backend/src/schemas/weather.ts`

### Acceptance Criteria

- Route handlers do not manually cast `request.body as ...` unless unavoidable.
- Invalid request bodies produce consistent `400` responses.
- Request types are inferred from schemas where possible.
- Backend build passes.

---

## 8. Move Backend Business Logic Out Of Route Modules

### Problem

Backend route modules currently mix:

- request parsing
- validation
- persistence
- domain logic
- response formatting

For example, `backend/src/routes/mirror.ts` handles user registration, agenda seeding, mirror state updates, dashboard summary payload normalization, and route responses.

### Suggested Work

Create service modules:

- `backend/src/services/user-registration-service.ts`
- `backend/src/services/mirror-state-service.ts`
- `backend/src/services/dashboard-summary-service.ts`
- `backend/src/services/user-language-service.ts`
- `backend/src/services/voice-command-service.ts`

Routes should:

- validate input
- call a service
- return the service result

### Acceptance Criteria

- Route files are thin.
- Business logic is reusable outside HTTP handlers.
- Services can be tested without Fastify.
- Backend build passes.

---

## 9. Abstract AI Provider Calls

### Problem

DeepSeek HTTP calls are embedded directly in domain modules:

- `backend/src/lib/intent.ts`
- `backend/src/lib/dashboard-summary.ts`

This makes provider switching or fallback strategies harder.

### Suggested Work

Create:

- `backend/src/ai/ai-client.ts`
- `backend/src/ai/deepseek-client.ts`
- optional `backend/src/ai/types.ts`

Expose provider-neutral methods:

- `classifyIntent(params)`
- `generateDashboardSummary(params)`

Keep DeepSeek prompt details isolated in the DeepSeek client or prompt builders.

### Acceptance Criteria

- Domain logic does not call `fetch("https://api.deepseek.com/...")` directly.
- DeepSeek model/env handling is centralized.
- It is easy to add another provider later.

---

## 10. Split Weather Into Provider, Cache, And Normalizer

### Problem

`backend/src/lib/weather.ts` owns multiple responsibilities:

- default mock weather
- OpenWeather API calls
- weather payload normalization
- cache read/write
- cache TTL handling
- rain chance descriptions

This file will grow as weather features expand.

### Suggested Work

Create:

- `backend/src/weather/weather-cache.ts`
- `backend/src/weather/openweather-provider.ts`
- `backend/src/weather/mock-weather-provider.ts`
- `backend/src/weather/normalize-weather.ts`
- `backend/src/weather/types.ts`

### Acceptance Criteria

- Cache logic is separate from provider logic.
- OpenWeather transformation is isolated.
- Mock weather can be replaced or expanded independently.
- `getWeatherForLocation()` remains a small facade.

---

## 11. Add Face Recognition Configuration

### Problem

Face recognition contains important tuning values inline:

- model URL
- face distance threshold
- detector input size
- detector score threshold
- oval bounds
- camera constraints

These values affect product behavior and should be visible/configurable.

### Affected File

- `frontend/src/services/face-recognition/BrowserFaceRecognitionService.ts`

### Suggested Work

Create:

- `frontend/src/services/face-recognition/config.ts`

Include:

- `modelUrl`
- `faceDistanceThreshold`
- `tinyFaceDetectorOptions`
- `cameraConstraints`
- `scanOvalBounds`

### Acceptance Criteria

- No hardcoded detection tuning values remain in service logic.
- Detection behavior can be tuned from one config file.
- Frontend build passes.

---

## 12. Introduce Feature Folders

### Problem

The frontend is currently organized primarily by technical type:

- `components`
- `controllers`
- `hooks`
- `types`
- `utils`

This works early, but feature changes often span many folders.

### Suggested Structure

Introduce feature folders gradually:

- `frontend/src/features/mirror`
- `frontend/src/features/registration`
- `frontend/src/features/language`
- `frontend/src/features/voice`
- `frontend/src/features/face-recognition`
- `frontend/src/features/dashboard`

Shared UI can remain in:

- `frontend/src/components`

Shared utilities can remain in:

- `frontend/src/utils`

### Acceptance Criteria

- New logic is placed by feature when it is feature-specific.
- Shared components remain generic.
- Imports remain readable.

---

## 13. Convert Complex `.jsx` Components To `.tsx`

### Problem

The project uses TypeScript, but many complex React components are still `.jsx`. This limits prop checking and makes refactors less safe.

### Priority Components

- `frontend/src/components/voice-control/index.jsx`
- `frontend/src/components/voice-activity-indicator/index.jsx`
- `frontend/src/pages/home/index.jsx`
- `frontend/src/pages/register/index.jsx`
- `frontend/src/pages/change-lang/index.jsx`
- `frontend/src/components/mirror-center/index.jsx`
- `frontend/src/components/registration-center/index.jsx`

### Suggested Work

- Convert one component at a time.
- Add explicit prop types.
- Preserve the existing component folder structure.

### Acceptance Criteria

- Converted files compile as `.tsx`.
- Props are typed.
- Frontend build passes after each conversion.

---

## 14. Share Or Generate API DTO Types

### Problem

Frontend and backend currently rely on manually aligned request and response types. This can drift over time.

### Suggested Work

Options:

- Define backend schemas and generate frontend types.
- Create a small shared `contracts` folder with DTO types.
- Use Fastify JSON schemas as the source of truth and export matching TypeScript types.

Potential DTO areas:

- mirror state
- registration
- dashboard summary
- user language mutation
- voice command
- weather payload
- agenda response

### Acceptance Criteria

- Frontend request/response types come from the same source as backend route contracts.
- Adding/changing an endpoint requires changing one contract definition.
- Both frontend and backend builds pass.

---

## 15. Add Linting, Formatting, And Typecheck Scripts

### Problem

Frontend and backend package scripts currently do not enforce linting. This makes structural refactors riskier.

### Suggested Work

Add:

- ESLint
- Prettier
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run check`

Potential root scripts:

- `check` - run frontend/backend typecheck and lint
- `format` - run Prettier
- `typecheck` - run TypeScript checks

### Acceptance Criteria

- `npm run check` exists at the root.
- TypeScript errors fail CI/local checks.
- Formatting is consistent.

---

## 16. Add Focused Tests Around Pure Logic

### Problem

The codebase has meaningful pure logic but no tests around it yet. Refactors will be safer if core behavior is pinned.

### Good Initial Test Targets

- intent classifier response parsing
- strict wake/sleep phrase behavior
- language normalization
- dashboard weather bucket classification
- average temperature calculation
- weather cache TTL behavior
- mirror reducer/state machine transitions once introduced
- face descriptor parse/encode helpers

### Suggested Tools

- Vitest for frontend and backend TypeScript logic
- Minimal integration tests for Fastify routes later

### Acceptance Criteria

- `npm test` or `npm run test` exists.
- Tests cover the core pure logic before large refactors.
- Tests run quickly.

---

## 17. Clean Repository Hygiene

### Problem

Local/generated files have appeared during development and should stay untracked:

- `.DS_Store`
- `dist`
- local SQLite files
- `node_modules`
- local env files
- demo artifacts unless intentionally kept

### Suggested Work

- Keep `.gitignore` strict.
- Confirm no generated files are tracked unexpectedly.
- Decide whether `demo.jpg` and files under `demo/` are product assets or local artifacts.

### Acceptance Criteria

- `git status` stays clean after builds.
- Generated files are ignored.
- Intentional assets are documented.

---

## Recommended Execution Order

1. Rename `VoicePhase` to `MirrorPhase`.
2. Add typed frontend API clients.
3. Convert mirror orchestration to reducer/state-machine style.
4. Split `useMirrorController` into smaller controllers.
5. Replace setter injection with intent-level actions.
6. Extract speech recognition into `useSpeechRecognition`.
7. Add backend request validation.
8. Move backend business logic into services.
9. Abstract AI provider calls.
10. Split weather provider/cache/normalizer logic.
11. Add face recognition configuration.
12. Introduce feature folders gradually.
13. Convert complex `.jsx` components to `.tsx`.
14. Share or generate API DTO types.
15. Add linting, formatting, and typecheck scripts.
16. Add focused tests around pure logic.
17. Clean repository hygiene.
