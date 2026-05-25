# MediCore Hospital Management SaaS

A complete multi-tenant Hospital Management SaaS platform with 5 role-based panels, JWT auth, subscription management, calendar booking, billing reports, and full hospitalId-based data isolation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, exposed at /api)
- `pnpm --filter @workspace/hospital-saas run dev` — run the frontend (port 21201, exposed at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data (idempotent)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS + shadcn/ui + Recharts + Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (stored in localStorage), bcryptjs for passwords
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/db/src/schema/` — DB schema (users, hospitals, subscriptions, departments, staff, patients, appointments, invoices, prescriptions, support)
- `artifacts/api-server/src/routes/` — API route handlers (auth, hospitals, subscriptions, departments, doctors, receptionists, patients, appointments, invoices, prescriptions, reports, support)
- `artifacts/api-server/src/middlewares/authenticate.ts` — JWT middleware + requireRoles/requireHospital guards
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify, bcrypt hash/compare
- `artifacts/hospital-saas/src/` — React frontend (pages, components, lib/auth.ts)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas (do not edit)
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- **hospitalId isolation**: Every DB query in route handlers filters by `hospitalId` taken from the JWT — never from the request body for non-super-admin users
- **JWT in localStorage**: Auth token stored as `medicore_token` in localStorage; `custom-fetch.ts` reads it and attaches as `Authorization: Bearer` header to every API request
- **Contract-first API**: OpenAPI spec drives Orval codegen — all hooks and Zod schemas are generated; do not hand-write them
- **Role hierarchy**: SUPER_ADMIN (platform) → HOSPITAL_ADMIN → RECEPTIONIST / DOCTOR → PATIENT; each role only sees their own hospital's data
- **Invoice numbering**: Format `{PREFIX}-{SEQ}` where PREFIX comes from hospital settings and SEQ is auto-incremented per hospital
- **Token generation**: For appointments, token number auto-increments per doctor per day

## Product

**5 Role-Based Panels:**
1. **Super Admin** — manage hospitals, subscription plans, global reports, support tickets
2. **Hospital Admin** — manage doctors, receptionists, patients, departments, calendar, invoices, reports, settings
3. **Receptionist** — book appointments, generate invoices, daily collection dashboard
4. **Doctor** — view today's schedule, write prescriptions, manage patient history
5. **Patient** — book appointments, view prescriptions, pay invoices

**Key Features:**
- Multi-tenant with full hospitalId-based data isolation
- JWT authentication with role-based route guards
- Calendar appointment view (custom, month/week/day)
- Doctor-wise billing reports with date range filtering
- Subscription plan management with usage meters
- Invoice generation with GST, discount, multiple payment methods

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@medicore.app | Admin@123 |
| Hospital Admin (Sunrise) | admin@sunrisemedical.com | Admin@123 |
| Doctor | dr.arjun@sunrisemedical.com | Doctor@123 |
| Receptionist | reception@sunrisemedical.com | Recep@123 |
| Hospital Admin (Apollo) | admin@apollocare.com | Admin@123 |

## User preferences

- Premium, clinical, data-forward UI — no emojis
- No external auth providers (pure JWT + bcrypt)
- hospitalId always from JWT, never from request body
- Custom calendar (no FullCalendar package)

## Gotchas

- After editing OpenAPI spec, run codegen before building: `pnpm --filter @workspace/api-spec run codegen`
- Seed script is idempotent — it checks for existing super admin before inserting
- `drizzle-orm` must be a direct dependency of any package using DB queries (not transitive)
- API server bundles all dependencies via esbuild — `bcryptjs` and `jsonwebtoken` are in `dependencies` not `devDependencies`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Generated hooks pattern: `useGetThing(id, { query: { enabled: !!id, queryKey: getGetThingQueryKey(id) } })`
- Mutations pattern: `mutation.mutate({ data: payload }, { onSuccess: (result) => ... })`
