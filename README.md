# AI Smart Mirror

A full-stack TypeScript smart mirror prototype. It uses voice and face recognition to wake the mirror, register the first user, and show a minimal black-and-white dashboard with weather, agenda, and device status.

## Structure

- `frontend` - React + Vite + Tailwind
- `backend` - Fastify + TypeScript + Prisma + SQLite

## Setup

1. Install dependencies from the root.
2. Backend Prisma reads `backend/.env`; copy `backend/.env.example` there if you want to change defaults.
3. Frontend reads `frontend/.env`; copy `frontend/.env.example` there if you want to change the API or face model URL.
4. Push the Prisma schema.
5. Start both apps.

```bash
npm install
npm run db:push
npm run dev
```

## Scripts

- `npm run dev` - run frontend and backend together
- `npm run dev:frontend` - run the frontend only
- `npm run dev:backend` - run the backend only
- `npm run build` - build both apps
- `npm run db:push` - create/update the SQLite schema
- `npm run db:reset` - clear the local SQLite data and recreate the schema
- `npm run db:generate` - generate the Prisma client
- `npm run db:studio` - open Prisma Studio
- `npm run models:download` - download face-api.js model files into `frontend/public/models`

## Face Recognition

The registration flow uses `face-api.js` in the browser.

- Put the model files under `frontend/public/models`
- Or run `npm run models:download`
- The default model URL is `/models`
- The scan step requires webcam permission

## Endpoints

- `GET /api/hello` - returns `hello world`
- `GET /api/health` - checks API and database connectivity
- `GET /api/mirror/state` - returns the current mirror state, active user, and registration status
- `POST /api/mirror/start-registration` - resets the mirror into first-user registration mode
- `POST /api/mirror/register-user` - creates a new user and seeds mock agenda/reminder data
- `POST /api/mirror/confirm-face` - marks the detected face as the active user
- `GET /api/users` - lists all registered users
- `GET /api/users/:id` - returns one user by id
- `GET /api/users/:id/agenda/today` - returns that user's agenda for today
- `GET /api/users/:id/weather` - returns weather for that user's saved location
- `GET /api/weather?location=Amsterdam` - returns weather for a location, with OpenWeather fallback when configured
- `POST /api/voice/command` - classifies a spoken command and returns a short mirror-style response
