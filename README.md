# CareerPilot

CareerPilot is a Next.js application for tracking job applications, status history, and job-search metrics. Authentication is provided by Clerk and application data is stored in PostgreSQL through Prisma.

Resume storage, PDF parsing, Notes CRUD, and AI provider integrations are not implemented yet.

## Requirements

- A Node.js version supported by Next.js 16 and Prisma 7
- pnpm
- Clerk application credentials
- A PostgreSQL database such as Neon

## Environment setup

Create `.env.local` for local development. Never commit real environment values.

The required variables are documented in `.env.example`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_SECRET_KEY=sk_test_replace_me
DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST/DATABASE
```

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is Clerk's browser-safe publishable key.
- `CLERK_SECRET_KEY` is server-only and must never be exposed to the browser or committed.
- `DATABASE_URL` is the pooled runtime connection used by the application and should be suitable for serverless deployment.
- `DIRECT_URL` is the direct database connection used by Prisma CLI and migration commands.

Use real values only in `.env.local` or deployment environment settings such as Vercel. If active credentials were ever committed, replacing the example file is not sufficient: rotate those credentials manually and review the repository history.

## Local development

```bash
pnpm install
pnpm prisma generate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The `postinstall` script generates Prisma Client with `prisma.generate.config.ts`, which does not require a database connection. A normal `pnpm install` therefore prepares the generated client even when migration credentials are unavailable. Running `pnpm prisma generate` explicitly is useful after changing the Prisma schema and uses the main Prisma configuration.

## Validation

```bash
pnpm lint
pnpm test:run
pnpm build
```

For watch-mode tests:

```bash
pnpm test
```

Tests use local mocks and pure helpers. They must not connect to Clerk or a production database.

## Prisma schema development

When intentionally changing the schema during local development:

```bash
pnpm prisma migrate dev --name describe_the_change
```

Review the generated SQL under `prisma/migrations/` before committing it. Do not create migrations for unrelated code-only changes.

## Production migrations

Prisma Client generation is handled by `postinstall`. Generation does not apply database migrations.

Apply tracked migrations through a controlled deployment or release step:

```bash
pnpm prisma migrate deploy
```

Do not run `prisma migrate dev` in production. Do not run migrations from application requests or server actions.

Vercel must have the Clerk variables and `DATABASE_URL` available during the relevant build and runtime phases. Install-time client generation does not require a database URL. `DIRECT_URL` must be available only in the controlled environment where Prisma migration commands are run.

## Route modes

- `/demo` is public and uses local sample data only.
- `/dashboard`, `/applications`, and other application routes are protected by Clerk.
- Server-side data access derives `userId` from Clerk and scopes user-owned records accordingly.
