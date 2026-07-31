# CareerPilot

CareerPilot is a Next.js application for tracking job applications, status history, and job-search metrics. Authentication is provided by Clerk and application data is stored in PostgreSQL through Prisma.

The protected Resume Analyzer accepts PDF or TXT resumes, extracts readable
text without storing the upload, and returns structured feedback from Ollama
locally or Groq when deployed to Vercel. The protected Resume Builder stores
one structured draft per account, provides grounded AI writing assistance,
shows a live ATS preview, and generates a text-based PDF. Application notes
CRUD remains outside the current implementation.

## Requirements

- A Node.js version supported by Next.js 16 and Prisma 7
- pnpm
- Clerk application credentials
- A PostgreSQL database such as Neon
- Ollama with the `qwen3:4b` model for local resume analysis and writing help
- A Groq API key for deployed resume analysis and writing help

## Environment setup

Create `.env.local` for local development. Never commit real environment values.

The required variables are documented in `.env.example`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
CLERK_SECRET_KEY=sk_test_replace_me
DATABASE_URL=postgresql://USER:PASSWORD@POOLED_HOST/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST/DATABASE
RESUME_ANALYSIS_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
GROQ_API_KEY=
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-20b
```

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is Clerk's browser-safe publishable key.
- `CLERK_SECRET_KEY` is server-only and must never be exposed to the browser or committed.
- `DATABASE_URL` is the pooled runtime connection used by the application and should be suitable for serverless deployment.
- `DIRECT_URL` is the direct database connection used by Prisma CLI and migration commands.
- `RESUME_ANALYSIS_PROVIDER` selects `ollama` or `groq`. When omitted, local
  development defaults to Ollama and Vercel defaults to Groq.
- `OLLAMA_BASE_URL` is the server-only local Ollama API address.
- `OLLAMA_MODEL` selects the local structured-analysis model.
- `GROQ_API_KEY` is a server-only credential required by the Vercel runtime.
- `GROQ_BASE_URL` and `GROQ_MODEL` configure the deployed cloud model.

Use real values only in `.env.local` or deployment environment settings such as Vercel. If active credentials were ever committed, replacing the example file is not sufficient: rotate those credentials manually and review the repository history.

## Local development

```bash
pnpm install
pnpm prisma generate
ollama pull qwen3:4b
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

For deployed resume analysis, configure these Vercel environment variables:

```dotenv
RESUME_ANALYSIS_PROVIDER=groq
GROQ_API_KEY=gsk_replace_me
GROQ_MODEL=openai/gpt-oss-20b
```

The API key remains server-only. Do not prefix it with `NEXT_PUBLIC_`.

## Route modes

- `/demo` is public and uses local sample data only.
- `/dashboard`, `/applications`, and other application routes are protected by Clerk.
- `/resume-builder` provides a persistent ATS resume editor for signed-in users.
- `/ai-studio` provides resume analysis for signed-in users.
- Server-side data access derives `userId` from Clerk and scopes user-owned records accordingly.

## Resume analysis

The analyzer accepts text-based PDF and TXT files up to 4 MB, keeping uploads
below Vercel's 4.5 MB Function payload limit. Files are handled
only for the active request. The original file and raw extracted text are not
written to application storage. The server extracts text, sends it to the
configured model with a strict JSON schema, validates the response, and saves
the latest structured analysis and editable resume draft to the signed-in
user's account. Local development uses Ollama. On Vercel, extracted resume text
is sent to Groq for the active request.

Scanned PDFs without a readable text layer currently require OCR before upload.
The analyzer can flag likely OCR errors in extracted text, but it does not
rewrite the source document or use the checked-in ML dataset at runtime.

## Resume Builder

The builder saves a validated structured draft to PostgreSQL and always scopes
it to the Clerk user ID from the server session. The initial template is a
single-column ATS layout with English and Turkish section headings. AI buttons
use the same local Ollama or deployed Groq configuration as Resume Analyzer and
are instructed to rewrite only facts already present in the draft.

The latest Resume Analyzer result is available inside the Builder. Users can
compare the current draft with the uploaded resume before replacing it, review
each recommendation as a before/after change, apply grounded text changes one
at a time, and undo the latest applied suggestion. Suggestions that cannot be
mapped safely open the relevant editor section instead of changing content
automatically.

PDF downloads are rendered on the server with selectable text and an embedded
Roboto Latin Extended font, so Turkish characters remain intact. Apply the
tracked Prisma migration before using the builder in an existing environment:

```bash
pnpm prisma migrate deploy
```
