# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Golden Axe Admin Panel - a Next.js admin interface for managing the Golden Axe EVM blockchain indexer. It connects to two PostgreSQL databases:
- **Frontend DB** (`PG_URL_FE`): Users, plans, API keys
- **Backend DB** (`PG_URL_BE`): Indexed blockchain data

## Commands

```bash
bun run dev    # Start dev server on port 3001
bun run build  # Production build
bun run start  # Production server on port 3000
```

## Architecture

### Tech Stack
- Next.js 14 with App Router
- Bun runtime
- PostgreSQL via `postgres` package (not Prisma)
- viem for ABI/event decoding
- TypeScript with strict mode

### Database Access
Database connections are in `lib/db.ts`:
- `sql` - Frontend database queries
- `beSql` - Backend database queries

### API Routes
All API endpoints are in `app/api/*/route.ts`. Routes use Next.js App Router conventions with GET/POST/DELETE handlers.

### Authentication
Password-based auth with cookie sessions (`middleware.ts`):
- Login page at `/login`
- Auth helpers in `lib/auth.ts`
- Session stored in signed `admin_session` cookie (7-day expiry)
- All routes protected except `/login` and `/api/auth/login`

### Frontend Structure
```
├── app/
│   ├── api/              # API routes (Next.js App Router)
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard (uses components below)
├── components/
│   ├── ui/               # Reusable UI components (Button, Card, Badge, Input, Table)
│   ├── tabs/             # Tab content components (NetworksTab, etc.)
│   ├── AdminContext.tsx  # Theme/dark mode context provider
│   └── index.ts          # Barrel exports
├── hooks/
│   ├── useDarkMode.ts    # Dark mode state + theme
│   ├── useApi.ts         # Data fetching hooks
│   └── index.ts
├── styles/
│   └── theme.ts          # Color palette, getColors(), getStyles()
├── types/
│   └── index.ts          # All TypeScript interfaces
├── lib/
│   ├── db.ts             # Database connections
│   └── auth.ts           # Session helpers
└── middleware.ts         # Route protection (must be at root - Next.js requirement)
```

### Key Patterns
- **Types**: All interfaces in `types/index.ts`, imported as `import { Network } from '@/types'`
- **Theme**: Use `useDarkMode()` hook or `useAdmin()` context for colors/styles
- **Components**: UI primitives in `components/ui/`, tab content in `components/tabs/`
- **API calls**: Use `useApi()` hook for GET requests, `useMutation()` for POST/DELETE

### Environment Variables
```
PG_URL_FE       # Frontend PostgreSQL connection string
PG_URL_BE       # Backend PostgreSQL connection string
BE_URL          # Backend API URL (for proxied requests)
ADMIN_PASSWORD  # Password for admin panel login
```
