# AI Smart Mirror

A full-stack TypeScript smart mirror prototype with a minimal black-and-white mirror UI.

## Structure

- `frontend` - React + Vite + Tailwind
- `backend` - Fastify + TypeScript + Prisma + SQLite

## Setup

1. Install dependencies from the root.
2. Backend Prisma reads `backend/.env`; copy `backend/.env.example` there if you want to change defaults.
3. Push the Prisma schema.
4. Start both apps.

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
- `npm run db:generate` - generate the Prisma client
- `npm run db:studio` - open Prisma Studio

## Endpoints

- `GET /api/hello` - returns `hello world`
- `GET /api/health` - checks API and database connectivity
