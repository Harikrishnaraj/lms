# Architecture Assessment

**Repository:** lms-monorepo
**Assessment Date:** 2026-08-25
**Compared Against:** Corporate LMS TRD v1.0, PRD v1.0, Architecture & Schema Blueprint

---

## 1. Current State

### 1.1 Project Structure

```
lms-monorepo/
├── apps/
│   ├── api/                    # NestJS backend (1,145 lines across 15 source files)
│   │   ├── src/
│   │   │   ├── auth/           # Auth module (controller, service, email service)
│   │   │   ├── ai-tutor/       # AI tutor controller (Gemini integration)
│   │   │   ├── assessments/    # Assessments controller
│   │   │   ├── calendar/       # Calendar controller (hardcoded events)
│   │   │   ├── certificates/   # Certificates controller
│   │   │   ├── courses/        # Courses controller
│   │   │   ├── dashboard/      # Dashboard controller
│   │   │   ├── discussions/    # Discussions controller
│   │   │   ├── notifications/  # Notifications controller
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── main.ts         # Bootstrap with Swagger + ValidationPipe
│   │   │   └── prisma.service.ts
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                    # React + Vite frontend (3,692 lines across 20 source files)
│       ├── src/
│       │   ├── components/     # Header, Sidebar
│       │   ├── context/        # AuthContext
│       │   ├── views/          # 13 view components
│       │   ├── App.tsx
│       │   ├── AppContent.tsx
│       │   ├── types.ts
│       │   ├── index.css       # Tailwind v4 + custom classes
│       │   └── main.tsx
│       ├── .figma/make/        # Figma Make tooling (7 files)
│       ├── vite.config.ts      # Vite 8 with Figma Make plugins + API proxy
│       └── package.json        # Named "figma-make-app"
├── packages/
│   ├── db/                     # Prisma schema + seed (590 lines)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # SQLite, 12 models, 177 lines
│   │   │   └── seed.ts         # Single-user seed data, 412 lines
│   │   ├── index.ts            # Re-exports @prisma/client
│   │   └── package.json        # Named "@lms/db"
│   ├── tsconfig/               # Shared base tsconfig
│   └── apps/api/dev.db         # SQLite database file (135 KB)
├── package.json                # Root monorepo config
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── .gitignore
└── .npmrc
```

### 1.2 Package Manager

- **pnpm** (v10.34.3 specified in `.mise.toml`)
- Workspaces configured: `apps/*`, `packages/*`
- Root `package.json` uses `corepack pnpm` for scripts
- `.npmrc` configures `only-built-dependencies` for Prisma/esbuild

### 1.3 Framework Configuration

**Backend (`apps/api`):**
- NestJS 11 with `@nestjs/platform-express`
- `@nestjs/swagger` 11 for OpenAPI docs
- `@nestjs/config` for environment config (ConfigModule.forRoot, isGlobal)
- Global API prefix: `/api/v1`
- Global `ValidationPipe` with `transform: true`
- CORS enabled (no origin restrictions)
- Swagger at `/api/v1/docs`
- Port: `process.env.PORT || 5000`
- TypeScript target: ES2022, CommonJS modules
- Extends shared `packages/tsconfig/base.json`

**Frontend (`apps/web`):**
- React 19 + Vite 8 (NOT Next.js)
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Figma Make integration (5 Vite plugins, shell scripts, site config)
- Vite proxy: `/api/v1` → `http://localhost:5000`
- Path alias: `@` → `./src`
- TypeScript: ES2020 target, bundler module resolution
- Fonts: Inter + Manrope (via Google Fonts import in CSS)

### 1.4 Database Configuration

- **Engine:** SQLite (file-based at `../../apps/api/dev.db`)
- **ORM:** Prisma Client 6.4.0
- **Schema location:** `packages/db/prisma/schema.prisma`
- **Models (12):** User, Course, CourseModule, Lesson, CourseEnrollment, LessonProgress, Assessment, Question, QuizAttempt, DiscussionThread, DiscussionReply, Notification, Certificate
- **Multi-tenancy:** None. No `organization_id` or tenant columns on any table.
- **Primary keys:** UUIDs (`@default(uuid())`)
- **Migrations:** Not used. Schema pushed via `prisma db push`.
- **Seed data:** Single hardcoded user ("Alex Johnson", ID `alex-johnson-uuid`), 4 courses, 5 assessments, 4 discussion threads, 3 notifications, 1 certificate.

### 1.5 Environment Configuration

- No `.env` file checked in (correctly gitignored)
- No environment validation schema (no Zod/Joi config validation)
- Backend reads: `PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `GEMINI_API_KEY`
- No `DATABASE_URL` environment variable — SQLite path is hardcoded in `schema.prisma`
- No `JWT_SECRET`, `REDIS_URL`, `S3_*` variables exist

### 1.6 Existing Tests

**None.** Zero test files exist anywhere in the repository. No test framework is configured. No `jest.config`, `vitest.config`, or test scripts in any `package.json`.

### 1.7 Existing UI Components

**Layout (2 components):**
- `Sidebar.tsx` — Fixed 240px left sidebar, learner-only nav items, hardcoded "Alex Johnson" user, "LearnSphere" branding
- `Header.tsx` — Sticky top bar with search input, notification/message/help icon buttons, avatar dropdown with logout

**Views (13 components, all learner-only):**
- `Dashboard.tsx` — Hardcoded milestones, tasks, recommendations (no API calls)
- `MyLearning.tsx` — Hardcoded course cards (no API calls)
- `LearningPath.tsx` — Hardcoded milestone progression (no API calls)
- `CoursePlayer.tsx` — Hardcoded module/lesson data (no API calls)
- `Quiz.tsx` — Hardcoded questions (no API calls)
- `Assessments.tsx` — Hardcoded assessment list (no API calls)
- `Assignments.tsx` — Hardcoded assignment list (no API calls)
- `CalendarView.tsx` — Hardcoded event data (no API calls)
- `Certificates.tsx` — Hardcoded certificates (no API calls)
- `AITutor.tsx` — Hardcoded AI chat with mock responses (no API calls)
- `Progress.tsx` — Hardcoded weekly data, skills, assessments (no API calls)
- `Notifications.tsx` — Hardcoded notification list (no API calls)
- `Discussions.tsx` — Stub (no API calls)
- `Login.tsx` — Functional login/verify/forgot-password flow (calls backend API)

**State management:**
- `AuthContext.tsx` — React Context with `user` state in localStorage. Calls `/api/v1/auth/*` endpoints. No JWT tokens — stores full user object.

**Styling approach:**
- Inline `style={{}}` objects on every element (not Tailwind utility classes in JSX)
- `index.css` defines Tailwind theme tokens and CSS classes (`.sidebar-link`, `.btn-primary`, `.badge-*`, `.progress-bar-*`) but views mostly ignore them
- No component library (no Radix UI, no Shadcn UI)

**Routing:**
- No router. `AppContent.tsx` uses `useState<View>` and conditional rendering (`{view === 'dashboard' && <Dashboard />}`).
- `View` type is a union of 13 string literals.

### 1.8 Existing API Code

**Authentication (`auth/` module):**
- `AuthController` — 6 POST endpoints: register, login, verify-email, forgot-password/send-otp, forgot-password/verify-otp, forgot-password/reset
- `AuthService` — bcrypt password hashing, OTP generation (6-digit random), email verification state via `verificationCode` column, password reset with OTP sentinel pattern
- `EmailService` — Nodemailer with SMTP or Ethereal fallback, HTML email templates for verification and password reset
- **No JWT tokens issued.** Login returns the full user record. No session management. No refresh tokens. No auth guards on any endpoint.

**Domain controllers (7, all standalone — no NestJS module encapsulation):**
- `DashboardController` — `GET /dashboard` returns hardcoded milestones/tasks/recommendations, queries one course for progress
- `CoursesController` — `GET /courses`, `GET /courses/:id`, `POST /courses/:id/lessons/:lessonId/complete`
- `AssessmentsController` — `GET /assessments`, `GET /assessments/:id/quiz`, `POST /assessments/:id/submit`
- `DiscussionsController` — `GET /discussions`, `GET /discussions/:id`, `POST /discussions`, `POST /discussions/:id/reply`
- `CertificatesController` — `GET /certificates`
- `NotificationsController` — `GET /notifications`, `POST /notifications/:id/read`
- `CalendarController` — `GET /calendar` (fully hardcoded, no database)
- `AITutorController` — `GET /ai-tutor/history`, `POST /ai-tutor/chat` (in-memory chat history, Google Gemini or mock fallback)

**Critical issues across all controllers:**
- User ID hardcoded to `'alex-johnson-uuid'` in every controller
- No authentication guards on any endpoint
- No authorization checks
- No tenant scoping
- No DTOs or input validation (beyond global ValidationPipe which has nothing to validate)
- No standard response envelope
- Some endpoints return `{ error: '...' }` with 200 status instead of proper HTTP errors
- AI tutor stores chat history in controller instance memory (lost on restart, shared across all requests)

### 1.9 Existing Documentation

- `apps/web/CLAUDE.md` — Points to `AGENTS.md`
- `apps/web/AGENTS.md` — Figma Make development guide (Vite dev server, project structure, styling notes, code quality rules)
- No README at root
- No API documentation beyond auto-generated Swagger
- No architecture decision records
- No deployment documentation

---

## 2. What Can Be Reused

### 2.1 Monorepo Structure (partial)

The `apps/` and `packages/` workspace layout aligns with TRD Section 8. Reusable elements:
- pnpm workspaces configuration (`pnpm-workspace.yaml`)
- Root `package.json` orchestration pattern (concurrent dev, filtered scripts)
- `.npmrc` build dependency configuration
- `.gitignore` coverage (node_modules, dist, .env, .db files)
- Shared `packages/tsconfig/base.json` with decorator support

### 2.2 NestJS Bootstrap (`apps/api/src/main.ts`)

The bootstrap pattern is TRD-aligned:
- Global prefix `/api/v1` matches TRD Section 15
- `ValidationPipe` with `transform: true` is correct
- Swagger/OpenAPI setup matches TRD Section 6.1
- CORS enablement is needed (though origin restrictions must be added)

### 2.3 PrismaService (`apps/api/src/prisma.service.ts`)

The `PrismaService` pattern (extends `PrismaClient`, implements `OnModuleInit`/`OnModuleDestroy`) is standard NestJS-Prisma integration. Reusable as-is.

### 2.4 Auth Flow Concepts

The authentication flow logic in `AuthService` is partially reusable:
- Password hashing with bcrypt (TRD Section 28 specifies bcrypt or Argon2id)
- Email verification with OTP pattern
- Password reset with multi-step OTP flow
- `EmailService` with SMTP transport and Ethereal fallback for development

These patterns survive but the implementation must be rewritten to add JWT issuance, refresh tokens, and tenant context.

### 2.5 Business Logic Patterns

Certain logic fragments can inform the production implementation:
- Course progress calculation (completed lessons / total lessons percentage) in `CoursesController`
- Lesson completion upsert with aggregate recalculation in `CoursesController.completeLesson`
- Quiz auto-grading logic (compare answers to `correctIndex`, compute score percentage, check against passing threshold) in `AssessmentsController.submitQuiz`
- Discussion thread view-count increment in `DiscussionsController`

### 2.6 CSS Design Tokens

`apps/web/src/index.css` defines a usable token set:
- Color variables (navy, accent, success, warning, error, AI purple, slate scale)
- Border radius scale (sm/md/lg/xl)
- Font family declarations (Inter, Manrope)
- Utility classes (`.sidebar-link`, `.btn-primary`, `.btn-secondary`, `.badge-*`, `.progress-bar-*`)

These partially align with the DESIGN.md specification from the UI/UX zip. The token names need remapping to match the Material Design 3 color system in DESIGN.md (e.g., `primary`, `on-primary`, `surface-container`).

### 2.7 Seed Data Structure

The seed script (`packages/db/prisma/seed.ts`) establishes a useful test dataset pattern. The entities and relationships (user → enrollments → courses → modules → lessons → progress) match the TRD entity model. Must be rewritten for PostgreSQL and multi-tenant schema.

---

## 3. What Must Be Created

### 3.1 Database Layer

| Item | TRD Reference | Notes |
|------|---------------|-------|
| PostgreSQL datasource configuration | Section 11.1 | Replace SQLite with PostgreSQL 16+ |
| `organizations` table | Section 13.1 | Tenant root entity with branding, timezone, status |
| `users` table with `organization_id` | Section 13.1 | Add tenant FK, department_id, manager_id, external_auth_id, status enum |
| `roles` and `permissions` tables | Section 6.2, 10.2 | Granular permission registry (course:create, course:publish, etc.) |
| `departments` table | Section 6.2 | Referenced by users and assignment rules |
| `courses` table with state machine | Section 13.1 | DRAFT → UNDER_REVIEW → PUBLISHED → ARCHIVED lifecycle |
| `course_modules` table | Section 13.1 | With `position` ordering |
| `content_items` table | Section 13.1 | Type enum (VIDEO, DOCUMENT, SCORM, QUIZ), storage_reference |
| `enrollments` table with tenant scoping | Section 13.1 | MANDATORY/SELF_ENROLLED type, status transitions, due dates |
| `progress` table | Section 13.1 | Per content_item tracking, playback position |
| `assessments` table | Section 13.1 | Passing score, attempt limits |
| `assessment_attempts` table | Section 13.1 | Score tracking, pass/fail |
| `certificates` table | Section 13.1 | Serial number, verification token, S3 reference |
| `audit_logs` table | Section 13.1 | Immutable logs with actor, IP, metadata JSONB |
| `learning_paths` table | Section 12 | Multi-course sequential paths |
| `assignment_rules` table | Architecture Blueprint Section 1 | Department-based auto-enrollment rules |
| Row-Level Security policies | Architecture Blueprint Section 1 | PostgreSQL RLS for tenant isolation |
| Prisma migration workflow | TRD Section 8 | Version-controlled migrations replacing `db push` |
| Multi-tenant seed data | — | Multiple organizations, users across roles |

### 3.2 Authentication & Authorization

| Item | TRD Reference | Notes |
|------|---------------|-------|
| JWT access token issuance (15-min expiry) | Section 10.1 | `sub`, `org_id`, `role_id`, `permissions` claims |
| Refresh token with HttpOnly cookie (7-day expiry) | Section 10.1 | Redis-backed revocation |
| `JwtAuthGuard` | Section 10.2, 18 | Validates signature and expiry on every request |
| `TenantGuard` / `TenantContextInterceptor` | Section 9.2, 18 | Resolves tenant from JWT claims, sets request context |
| `PermissionsGuard` | Section 10.2, 18 | Validates `@Permissions('course:publish')` decorators |
| `@Permissions()` decorator | Section 10.2 | Custom NestJS decorator for route-level permission checks |
| Rate limiting middleware | Section 18 | 100 req/min per IP/token |
| Input validation pipe with Zod/DTO schemas | Section 18 | Replace untyped `@Body()` with class-validator DTOs |
| Redis connection for session management | Section 20 | Token revocation, permission caching |
| Password hashing upgrade path | Section 28 | Argon2id preferred, bcrypt acceptable |

### 3.3 Backend Module Structure

The TRD (Section 6.2) specifies the following modules. Modules that do not exist at all are marked **NEW**. Modules that exist as standalone controllers but lack proper NestJS module encapsulation are marked **RESTRUCTURE**.

| Module | Status | TRD Section |
|--------|--------|-------------|
| `auth/` | RESTRUCTURE — exists as module but lacks JWT, guards, strategies | 6.2 |
| `organizations/` | **NEW** | 6.2 |
| `users/` | **NEW** | 6.2 |
| `roles/` | **NEW** | 6.2 |
| `permissions/` | **NEW** | 6.2 |
| `courses/` | RESTRUCTURE — controller only, no module/service split | 6.2 |
| `content/` | **NEW** | 6.2 |
| `enrollments/` | **NEW** — enrollment logic is inside courses controller | 6.2 |
| `learning-paths/` | **NEW** | 6.2 |
| `assignments/` | **NEW** — auto-assignment rule engine | 6.2 |
| `assessments/` | RESTRUCTURE — controller only | 6.2 |
| `certificates/` | RESTRUCTURE — controller only, no PDF generation | 6.2 |
| `progress/` | **NEW** — progress tracking is scattered across courses controller | 6.2 |
| `notifications/` | RESTRUCTURE — controller only, no multi-channel pipeline | 6.2 |
| `announcements/` | **NEW** | 6.2 |
| `analytics/` | **NEW** | 6.2 |
| `search/` | **NEW** — PostgreSQL full-text search | 6.2 |
| `subscriptions/` | **NEW** — tenant seat/license management | 6.2 |
| `audit/` | **NEW** | 6.2 |
| `ai/` | RESTRUCTURE — hardcoded to Gemini, no abstraction boundary | 6.2 |
| `files/` | **NEW** — S3 presigned URL generation | 6.2 |
| `common/` | **NEW** — shared decorators, filters, interceptors | 6.2 |
| `config/` | **NEW** — Zod environment validation | 6.2 |

### 3.4 API Contracts

All API endpoints must be rebuilt with:
- Standard success response envelope (`{ data, meta: { requestId, timestamp, pagination } }`) per TRD Section 16.2
- Standard error response envelope (`{ error: { code, message, details }, meta }`) per TRD Section 16.3
- DTOs with class-validator decorators for all request bodies
- Proper HTTP status codes (not 200 with `{ error }`)
- `Authorization: Bearer <JWT>` header requirement
- `X-Correlation-ID` header support for log tracing

### 3.5 Frontend Application

| Item | TRD Reference | Notes |
|------|---------------|-------|
| Next.js App Router setup | Section 5.1 | Replace Vite + React SPA |
| Route structure: `(public)/`, `(auth)/`, `learner/`, `trainer/`, `manager/`, `admin/` | Section 5.2 | Role-based workspace routing |
| TanStack Query (React Query) for server state | Section 5.1 | Replace direct fetch calls |
| Zustand for client UI state | Section 5.1 | Replace useState-based view switching |
| Shadcn UI + Radix UI component library | Section 5.1 | Replace inline styles |
| React Hook Form + Zod validation | Section 5.1 | Replace uncontrolled form inputs |
| JWT token management | Section 10.1 | Bearer token in API calls, refresh flow |
| Role-based navigation rendering | App Flow | Different sidebars per portal |
| Trainer portal views | PRD, App Flow | Course builder, grading, Q&A, learner progress |
| Manager portal views | PRD, App Flow | Team view, approvals, team reports |
| HR/L&D Admin portal views | PRD, App Flow | Users, departments, assignments, analytics, compliance |
| Organization Admin portal views | PRD, App Flow | Settings, roles, permissions, integrations, audit |
| Design system implementation | DESIGN.md | Deep Navy primary, Inter font, Material Design 3 color tokens |

### 3.6 Infrastructure

| Item | TRD Reference | Notes |
|------|---------------|-------|
| `docker-compose.yml` for local dev | Section 8, 24 | PostgreSQL, Redis, LocalStack (S3) |
| Dockerfile for API | Section 23 | Multi-stage build |
| Dockerfile for Web | Section 23 | Multi-stage build |
| Environment variable validation (Zod) | Section 25 | Fail-fast on boot if missing |
| Redis connection setup | Section 20 | BullMQ job queues, session cache |
| S3 client configuration | Section 19 | Presigned URL generation |
| BullMQ queue definitions | Section 21 | email-queue, pdf-queue, import-queue, assignment-queue |

### 3.7 Testing

| Item | TRD Reference | Notes |
|------|---------------|-------|
| Test framework setup (Jest or Vitest) | Section 27 | Zero test infrastructure exists |
| Unit tests for services | Section 27 | Pure functions, validation, business logic |
| Integration tests for API endpoints | Section 27 | Supertest + test database |
| E2E test framework (Playwright) | Section 27 | Critical user flows |

### 3.8 Observability

| Item | TRD Reference | Notes |
|------|---------------|-------|
| Structured JSON logging | Section 29 | timestamp, level, correlationId, tenantId, userId, module, message |
| Prometheus metrics endpoint | Section 29 | HTTP latency, DB pool, Redis memory, BullMQ depth |
| OpenTelemetry instrumentation | Section 29 | Distributed tracing |

---

## 4. What Conflicts with the TRD

### 4.1 Database Engine

**Current:** SQLite (file-based, single-writer, no concurrent access, no RLS)
**TRD:** PostgreSQL 16+ (Section 11.1)
**Impact:** Complete schema rewrite required. SQLite lacks: UUID generation functions, JSONB type, TIMESTAMPTZ, Row-Level Security, full-text search, concurrent connections.
**Resolution:** New Prisma schema with `provider = "postgresql"`, `DATABASE_URL` from environment.

### 4.2 Frontend Framework

**Current:** React 19 + Vite 8 (SPA, client-side only)
**TRD:** Next.js with App Router (Section 5.1)
**Impact:** The entire `apps/web/` directory is built on Vite with Figma Make plugins. The Figma Make integration (5 Vite plugins, shell scripts, site.json, dev.json) is specific to the Figma Make development environment and has no equivalent in Next.js.
**Resolution:** New `apps/web/` built on Next.js. The existing view components contain useful UI patterns and layout logic that can be ported, but the framework shell, routing, and build pipeline are incompatible.

### 4.3 Multi-Tenancy

**Current:** No tenant concept. Single-user, single-organization.
**TRD:** Shared database with discriminator column strategy. Every tenant-owned table must have `organization_id UUID NOT NULL`. Every query must include `WHERE organization_id = :currentTenantId`. (Section 9)
**Impact:** Every model, every query, every controller, and every test must be tenant-aware.
**Resolution:** Add `organization_id` to all relevant models. Create `TenantContextInterceptor`. Enforce tenant scoping in a base repository or Prisma middleware.

### 4.4 Authentication Architecture

**Current:** No JWT. Login returns raw user object. User stored in localStorage. No guards on any endpoint.
**TRD:** Short-lived JWT access tokens (15 min) + HttpOnly refresh cookies (7 days) + Redis revocation. JWT contains `sub`, `org_id`, `role_id`, `permissions`. (Section 10.1)
**Impact:** Complete authentication rewrite. Every API endpoint is currently unprotected.
**Resolution:** Implement JWT issuance, refresh token rotation, `JwtAuthGuard`, and apply guards globally or per-module.

### 4.5 Authorization Model

**Current:** `role` is a freeform string on the User model ("student", "instructor", "admin"). No permission checks anywhere. User ID is hardcoded.
**TRD:** 5 platform roles (LEARNER, TRAINER, MANAGER, HR_LD_ADMIN, ORGANIZATION_ADMIN) with granular permission strings (e.g., `course:create`, `course:publish`, `report:export`, `user:manage`). (Section 10.2)
**Impact:** New roles table, permissions table, role-permission mapping. `PermissionsGuard` and `@Permissions()` decorator. Manager scope enforcement.
**Resolution:** Create RBAC module. Migrate role from string to enum/FK. Implement permission-based guards per TRD Section 10.2.

### 4.6 API Design

**Current:** No standard response envelope. Errors returned as `{ error: 'message' }` with 200 status. No DTOs. No input validation classes. No pagination.
**TRD:** Standard `{ data, meta }` success envelope, `{ error: { code, message, details }, meta }` error envelope. URL-path versioning. (Section 16)
**Impact:** Every controller response must be wrapped. Custom exception filters needed.
**Resolution:** Create response interceptor for success envelope. Create exception filter for error envelope. Add DTOs with class-validator to all endpoints.

### 4.7 State Management Architecture

**Current:** No state management library. Views use local `useState`. No server-state caching. Most views use hardcoded data instead of API calls.
**TRD:** TanStack Query for server state, Zustand for client UI state. (Section 5.1)
**Impact:** All data fetching must be refactored into TanStack Query hooks. UI state (sidebar collapse, modals, filters) managed via Zustand stores.
**Resolution:** Part of the Next.js frontend rebuild.

### 4.8 UI Component Library

**Current:** Inline styles on every element. No component library. Two fonts (Inter + Manrope). Blue-accent color scheme.
**TRD:** Tailwind CSS + Radix UI primitives / Shadcn UI components. (Section 5.1)
**DESIGN.md:** Deep Navy (#1A365D) primary, Inter font only, Material Design 3 color system, 8px radius base, card/elevation system.
**Impact:** Every view component's styling must be rewritten.
**Resolution:** Install Shadcn UI. Configure Tailwind with DESIGN.md tokens. Port view layouts using Shadcn components.

### 4.9 Hardcoded Data

**Current:** 11 of 13 frontend views render hardcoded arrays defined in the component file. Only `Login.tsx` calls the backend API. Several backend controllers also return partially hardcoded data (DashboardController milestones/tasks/recommendations, CalendarController events, CertificatesController instructor name).
**TRD:** Frontend is never trusted for business data. All data served via API. (Section 5.3)
**Impact:** Every view must be connected to real API endpoints. Backend must serve all data from the database.
**Resolution:** Part of the full-stack feature implementation after foundation is established.

### 4.10 AI Integration Boundary

**Current:** `AITutorController` directly imports `@google/generative-ai` (Google Gemini). In-memory chat history stored in the controller instance. No abstraction layer.
**TRD:** Isolated AI module with `AIServiceInterface` boundary. Provider-agnostic interface methods (`generateQuizQuestions`, `summarizeLessonContent`, `recommendNextLearningPath`). Swappable providers (OpenAI, Anthropic, custom). (Section 22)
**Impact:** AI integration must be decoupled from any specific provider.
**Resolution:** Create `ai/` module with interface, provider strategy pattern, and concrete provider implementations.

### 4.11 Naming Conflict

**Current:** Frontend package named `figma-make-app`. Root dev script filters by this name. Sidebar shows "LearnSphere" branding.
**TRD:** Product is a Corporate LMS platform. UI spec shows "Nexus LMS" branding.
**Impact:** Package name, branding, and script references need updating.
**Resolution:** Rename during frontend rebuild.

---

## 5. Recommended Implementation Sequence

Each phase builds on the previous. Phases should not be executed in parallel. Within each phase, tasks are listed in dependency order.

### Phase 0: Foundation Infrastructure

**Goal:** Establish the development environment, database, and project scaffolding that all subsequent phases depend on.

1. Set up `docker-compose.yml` with PostgreSQL 16 and Redis 7
2. Create `packages/db/prisma/schema.prisma` with PostgreSQL provider and `DATABASE_URL` from env
3. Define core tenant schema: `organizations`, `users`, `departments`, `roles`, `permissions`, `role_permissions`
4. Create initial Prisma migration
5. Create `apps/api/src/config/` module with Zod environment validation (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, REDIS_URL)
6. Update `PrismaService` to use PostgreSQL connection
7. Create `apps/api/src/common/` with response envelope interceptor, global exception filter, correlation ID middleware
8. Create seed script with: 2 organizations, users across all 5 roles, departments
9. Verify: `docker compose up`, `pnpm db:generate`, `pnpm db:push`, `pnpm db:seed`, API boots without error

### Phase 1: Authentication & Authorization

**Goal:** Secure the API. No feature work proceeds without working auth.

1. Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `ioredis`/`@nestjs/bullmq`
2. Create `auth/` module: JWT strategy, access token issuance, refresh token with HttpOnly cookie
3. Create Redis service for refresh token revocation
4. Create `JwtAuthGuard` (global)
5. Create `TenantContextInterceptor` — extract `org_id` from JWT, attach to request
6. Create `PermissionsGuard` and `@Permissions()` decorator
7. Create `@CurrentUser()` parameter decorator
8. Implement auth endpoints: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
9. Apply `JwtAuthGuard` globally with public-route exemptions
10. Verify: login returns JWT, refresh rotates token, protected routes reject unauthenticated requests, tenant isolation works

### Phase 2: Core Domain Models & CRUD

**Goal:** Build the data layer for courses, content, enrollments, and assessments.

1. Extend Prisma schema: `courses`, `course_modules`, `content_items`, `enrollments`, `progress`, `assessments`, `assessment_attempts`, `certificates`, `learning_paths`, `audit_logs`, `notifications`, `assignment_rules`
2. Create NestJS modules with controller/service/DTO for each domain:
   - `organizations/` — tenant CRUD, branding
   - `users/` — user CRUD, department assignment, manager hierarchy
   - `courses/` — course lifecycle (DRAFT → PUBLISHED → ARCHIVED), module/content CRUD
   - `enrollments/` — manual and rule-based enrollment, status transitions
   - `assessments/` — quiz authoring, attempt tracking, auto-grading
   - `progress/` — lesson completion, playback position, enrollment progress aggregation
   - `certificates/` — completion check, serial number generation
   - `notifications/` — trigger-based dispatch, read status
   - `audit/` — immutable log creation
3. Enforce `organization_id` scoping in every query via Prisma middleware or base service
4. Verify: full CRUD operations work for all entities, tenant isolation holds, audit logs are created

### Phase 3: Frontend Foundation

**Goal:** Establish the Next.js application shell with authentication, routing, and design system.

1. Replace `apps/web/` with Next.js App Router project
2. Install and configure: Tailwind CSS, Shadcn UI, TanStack Query, Zustand, React Hook Form, Zod
3. Implement DESIGN.md color system and typography as Tailwind theme
4. Create auth client: JWT storage, refresh flow, axios/fetch interceptor
5. Create layout components: `AppShell`, `Sidebar`, `Header` using Shadcn UI
6. Create route groups: `(public)/`, `(auth)/login`, `learner/`, `trainer/`, `admin/`
7. Implement role-based redirect after login (learner → `/learner/dashboard`, trainer → `/trainer/dashboard`, etc.)
8. Verify: login flow works end-to-end, role-based routing works, design system renders correctly

### Phase 4: Learner Portal

**Goal:** Build the learner-facing experience — the primary user journey.

1. Learner dashboard (active course, tasks, milestones, recommendations)
2. Course catalog and search
3. Course player (module/lesson navigation, video playback position, lesson completion)
4. Assessments (quiz rendering, submission, auto-grading, results)
5. Progress tracking (per-course, overall)
6. Certificates (earned list, PDF download)
7. Notifications (list, read/unread)
8. Verify: complete learner journey from enrollment to certificate

### Phase 5: Trainer Portal

**Goal:** Build the trainer/instructor experience.

1. Course builder (create course, add modules, add content items)
2. Content upload (S3 presigned URL flow)
3. Assessment authoring (create quizzes, question banks)
4. Learner progress view (per-course enrollment list, progress details)
5. Grading interface (manual score override for non-auto-graded items)
6. Discussion Q&A (respond to learner threads)
7. Verify: trainer can create course, upload content, publish, view learner progress

### Phase 6: Administration Portal

**Goal:** Build the manager, HR/L&D, and org admin experiences.

1. Manager workspace: team view, team progress, approvals
2. HR/L&D workspace: user management, department management, assignment rules, compliance reports, analytics
3. Organization Admin workspace: organization settings, role/permission management, audit logs
4. Reporting and CSV/Excel export
5. Verify: all admin workflows function with correct permission boundaries

### Phase 7: Advanced Features

**Goal:** Build remaining TRD features that depend on the core platform.

1. AI module with provider abstraction (quiz generation, content summarization, learning path recommendations)
2. BullMQ background workers (email queue, PDF certificate generation, CSV import, nightly assignment processing)
3. File/media management (S3 presigned upload, SCORM package processing)
4. Learning paths (curated multi-course sequences)
5. Announcements (company/department broadcasts)
6. Search (PostgreSQL full-text indexing)
7. Verify: all features work end-to-end with proper auth, tenancy, and error handling

### Phase 8: Testing & Observability

**Goal:** Establish confidence in the system before production deployment.

1. Unit test suite for all services (Jest or Vitest)
2. Integration test suite for API endpoints (Supertest)
3. E2E test suite for critical user flows (Playwright)
4. Structured JSON logging
5. Health check endpoint improvements
6. Verify: all tests pass, logging is consistent, CI pipeline runs clean

---

## Appendix: File-by-File Inventory

### Files to Keep As-Is
- `.gitignore`
- `.npmrc`
- `pnpm-workspace.yaml`
- `packages/tsconfig/base.json`
- `packages/tsconfig/package.json`

### Files to Modify
- `package.json` — update scripts for Next.js + PostgreSQL workflow
- `packages/db/package.json` — add PostgreSQL dependencies, migration scripts
- `packages/db/prisma/schema.prisma` — complete rewrite for PostgreSQL + multi-tenant schema
- `packages/db/prisma/seed.ts` — rewrite for multi-tenant seed data
- `packages/db/index.ts` — keep (re-export pattern is fine)
- `apps/api/package.json` — add JWT, passport, Redis, BullMQ dependencies
- `apps/api/src/main.ts` — add security hardening (Helmet, CORS restrictions)
- `apps/api/src/app.module.ts` — register new modules, global guards/interceptors
- `apps/api/src/prisma.service.ts` — keep structure, update for PostgreSQL
- `apps/api/tsconfig.json` — keep
- `apps/api/nest-cli.json` — keep

### Files to Rewrite
- `apps/api/src/auth/*` — JWT strategy, guards, refresh tokens
- `apps/api/src/courses/courses.controller.ts` — proper module/service/DTO, tenant scoping
- `apps/api/src/assessments/assessments.controller.ts` — proper module/service/DTO
- `apps/api/src/dashboard/dashboard.controller.ts` — remove hardcoded data
- `apps/api/src/discussions/discussions.controller.ts` — proper module/service/DTO
- `apps/api/src/certificates/certificates.controller.ts` — add PDF generation, serial numbers
- `apps/api/src/notifications/notifications.controller.ts` — multi-channel pipeline
- `apps/api/src/ai-tutor/ai-tutor.controller.ts` — provider abstraction, persistent history
- `apps/api/src/calendar/calendar.controller.ts` — database-backed events
- `apps/web/*` — complete rewrite for Next.js

### Files to Create
- `docker-compose.yml`
- `apps/api/src/config/` — environment validation
- `apps/api/src/common/` — decorators, filters, interceptors, middleware
- `apps/api/src/organizations/` — full module
- `apps/api/src/users/` — full module
- `apps/api/src/roles/` — full module
- `apps/api/src/permissions/` — full module
- `apps/api/src/content/` — full module
- `apps/api/src/enrollments/` — full module
- `apps/api/src/learning-paths/` — full module
- `apps/api/src/assignments/` — full module
- `apps/api/src/progress/` — full module
- `apps/api/src/announcements/` — full module
- `apps/api/src/analytics/` — full module
- `apps/api/src/search/` — full module
- `apps/api/src/subscriptions/` — full module
- `apps/api/src/audit/` — full module
- `apps/api/src/files/` — full module

### Files to Delete
- `apps/web/.figma/` — Figma Make tooling (not compatible with Next.js)
- `apps/web/.mise.toml` — Figma Make environment
- `apps/web/AGENTS.md` — Figma Make documentation
- `apps/web/CLAUDE.md` — Points to AGENTS.md
- `packages/apps/api/dev.db` — SQLite database file (misplaced, will be replaced by PostgreSQL)
