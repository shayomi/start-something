# 🚀 just-start-dude

<p align="center">
  <img src="https://img.shields.io/npm/v/just-start-dude?color=a855f7&style=for-the-badge" alt="npm version">
  <img src="https://img.shields.io/npm/dt/just-start-dude?color=3b82f6&style=for-the-badge" alt="downloads">
  <img src="https://img.shields.io/github/stars/shayomi/start-something?color=f59e0b&style=for-the-badge" alt="stars">
  <img src="https://img.shields.io/badge/powered%20by-Claude%20AI-06b6d4?style=for-the-badge" alt="Claude AI">
</p>

<p align="center">
  <strong>Describe your app in plain English. Get a full, production-ready project.</strong>
</p>

<p align="center">
  <img src="https://github.com/shayomi/start-something/raw/main/demo.gif" alt="demo" width="700">
</p>

---

## ✨ What it does

You type one sentence. You get:

- ✅ Full project structure with all files
- ✅ AI-written components, routes, and logic
- ✅ Database schema & migrations
- ✅ Auth setup
- ✅ `.env.example` with all vars documented
- ✅ Professional `README.md`
- ✅ Dependencies auto-installed
- ✅ Git repo initialized
- ✅ Opens in VS Code

## 🎬 Demo

```bash
$ just-start-dude create "a SaaS app for freelancers to track invoices and clients"
```

→ Picks **Next.js + Prisma + NextAuth + Tailwind**  
→ Generates 18 files  
→ Installs deps  
→ Opens VS Code  
→ **Ready to run in 30 seconds**

---

## 📦 Installation

```bash
npm install -g just-start-dude
```

Or use without installing:

```bash
npx just-start-dude create "your project description"
```

---

## 🔑 Setup

You'll need an [Anthropic API key](https://console.anthropic.com).

```bash
just-start-dude config
```

Or set it as an environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🛠️ Usage

### Create a project

```bash
# Interactive - will ask for description
just-start-dude create

# Direct description
just-start-dude create "a REST API for a food delivery app with auth"

# Force a specific template
just-start-dude create "my app" --template fastapi

# Custom output directory
just-start-dude create "my app" --output ~/projects
```

### List templates

```bash
just-start-dude templates
```

| Template     | Stack                                     |
| ------------ | ----------------------------------------- |
| `nextjs`     | Next.js 14 + Tailwind + Prisma + NextAuth |
| `fastapi`    | FastAPI + SQLAlchemy + Alembic + Docker   |
| `react`      | React + Vite + Tailwind + React Query     |
| `express`    | Express.js + TypeScript + Prisma + JWT    |
| `fullstack`  | Next.js + FastAPI + Docker Compose        |
| `cli`        | Node.js + Commander + Chalk + Inquirer    |
| `chrome-ext` | Chrome Extension + React + Vite           |

### Options

```bash
just-start-dude create "my app" [options]

Options:
  -o, --output <dir>       Output directory (default: current dir)
  -t, --template <name>    Force a specific template
  --no-install             Skip npm install
  --no-open                Skip opening VS Code
```

---

## ⚡ Skills — Add features to existing projects

Already have a project? Use `just-start-dude setup` to drop in pre-built integrations instantly. Each skill installs the right packages, writes helper files, appends vars to `.env.example`, and generates a `docs/<skill>.md` guide explaining everything it did.

Supports **npm**, **pnpm**, **yarn**, and **bun** — auto-detected from your lockfile.

**47 skills across 17 categories.**

### Database — SQL (Managed Cloud)

| Skill              | Aliases              | What it sets up                                                |
| ------------------ | -------------------- | -------------------------------------------------------------- |
| `supabase`         | —                    | Supabase client, local Docker stack, typed server helper       |
| `neon`             | —                    | Neon serverless Postgres + Drizzle ORM                         |
| `planetscale`      | `ps`                 | PlanetScale serverless MySQL + Drizzle ORM                     |
| `cockroachdb`      | `cockroach`, `crdb`  | CockroachDB Serverless + Drizzle ORM (Postgres-compatible)     |
| `turso`            | `libsql`             | Turso libSQL + Drizzle ORM, sub-ms edge reads                  |
| `railway-postgres` | `railway`            | Railway-hosted Postgres + Drizzle ORM with SSL                 |
| `xata`             | —                    | Xata serverless Postgres + built-in search                     |

### Database — SQL (Local)

| Skill         | Aliases              | What it sets up                                                |
| ------------- | -------------------- | -------------------------------------------------------------- |
| `postgres`    | `pg`, `postgresql`   | Docker Compose Postgres 16 + pg + Drizzle ORM                 |
| `mysql`       | `mysql2`, `mariadb`  | Docker Compose MySQL 8 + mysql2 + Drizzle ORM                 |
| `sqlite`      | `sqlite3`            | better-sqlite3 + Drizzle ORM, zero setup, file-based          |
| `timescaledb` | `timeseries`, `tsdb` | TimescaleDB Docker + hypertable helpers for time-series data   |

### Database — NoSQL / Key-Value

| Skill                | Aliases                        | What it sets up                                                   |
| -------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `mongodb`            | `mongo`                        | Mongoose ODM + Docker local MongoDB + Atlas connection helper     |
| `upstash-redis`      | `redis`, `upstash`             | Upstash Redis client + cache helpers + sliding-window rate limiter|
| `firebase-firestore` | `firebase`, `firestore`        | Firebase + Admin SDK + Firestore CRUD helpers                     |
| `redis-local`        | `redis-docker`, `ioredis`      | Docker Redis + ioredis client + cache helpers                     |
| `dynamodb`           | `dynamo`                       | AWS DynamoDB + local Docker emulator + CRUD helpers               |

### Database — Backend Stacks (DB + Auth + Storage)

| Skill        | Aliases | What it sets up                                                          |
| ------------ | ------- | ------------------------------------------------------------------------ |
| `strapi`     | —       | Strapi CMS with Docker Compose stack and fetch helper                    |
| `appwrite`   | `aw`    | Appwrite Docker stack (DB + Auth + Storage), server SDK client           |
| `pocketbase` | `pb`    | PocketBase Docker container, JS SDK, CRUD helpers, real-time ready       |

### ORM / Database Tools

| Skill     | Aliases      | What it sets up                                                            |
| --------- | ------------ | -------------------------------------------------------------------------- |
| `prisma`  | `orm`        | Prisma ORM + schema + migrations + seed script                             |
| `drizzle` | —            | Drizzle ORM standalone + schema + migration runner                         |

### Auth & UI

| Skill    | Aliases | What it sets up                                            |
| -------- | ------- | ---------------------------------------------------------- |
| `clerk`  | —       | Clerk authentication with middleware and auth pages        |
| `oauth`  | —       | Auth.js v5 with GitHub and Google providers                |
| `shadcn` | —       | shadcn/ui component library with all base components       |

### AI / ML

| Skill      | Aliases                  | What it sets up                                                  |
| ---------- | ------------------------ | ---------------------------------------------------------------- |
| `openai`   | `ai`, `gpt`              | OpenAI SDK + streaming chat + embeddings + image gen helpers     |
| `pinecone` | `vectors`, `vectordb`    | Pinecone vector DB + upsert/query + RAG helper                   |
| `qdrant`   | `vector-search`          | Qdrant Docker + vector store + semantic search helpers           |

### Payments

| Skill          | Aliases          | What it sets up                                                        |
| -------------- | ---------------- | ---------------------------------------------------------------------- |
| `stripe`       | `payments`       | Stripe Checkout + webhooks + billing portal + customer helpers         |
| `lemonsqueezy` | `lemon`, `ls`    | LemonSqueezy checkout + webhooks + subscription helpers                |

### Email

| Skill      | Aliases        | What it sets up                                                   |
| ---------- | -------------- | ----------------------------------------------------------------- |
| `resend`   | `email`        | Resend client + React Email templates + send helper               |
| `postmark` | —              | Postmark transactional email + template helpers                   |

### Observability

| Skill    | Aliases                     | What it sets up                                                 |
| -------- | --------------------------- | --------------------------------------------------------------- |
| `sentry` | `errors`, `monitoring`      | Sentry error tracking + source maps + performance monitoring    |

### Analytics

| Skill      | Aliases              | What it sets up                                              |
| ---------- | -------------------- | ------------------------------------------------------------ |
| `posthog`  | `analytics`, `ph`    | PostHog product analytics + feature flags + session replay   |
| `plausible`| —                    | Plausible privacy-first analytics (self-hosted or cloud)     |

### Background Jobs

| Skill         | Aliases          | What it sets up                                                    |
| ------------- | ---------------- | ------------------------------------------------------------------ |
| `bullmq`      | `queue`, `bull`  | BullMQ Redis-backed job queues + worker + dashboard               |
| `inngest`     | `jobs`           | Inngest serverless background functions + event-driven workflows   |
| `trigger-dev` | `trigger`        | Trigger.dev background job orchestration + retry logic            |

### Search

| Skill         | Aliases            | What it sets up                                                    |
| ------------- | ------------------ | ------------------------------------------------------------------ |
| `meilisearch` | `search`, `meili`  | Meilisearch Docker + instant search + index helpers                |
| `typesense`   | —                  | Typesense Docker + fast search + collection helpers                |

### Storage

| Skill           | Aliases                  | What it sets up                                                  |
| --------------- | ------------------------ | ---------------------------------------------------------------- |
| `s3-storage`    | `s3`, `aws`              | AWS S3 uploads + presigned URLs + delete helpers                 |
| `cloudflare-r2` | `r2`, `cf`               | Cloudflare R2 (S3-compatible) + presigned URL helpers            |
| `minio`         | `object-storage`         | MinIO Docker + S3-compatible client + bucket helpers             |

### Developer Tools

| Skill          | Aliases                        | What it sets up                                              |
| -------------- | ------------------------------ | ------------------------------------------------------------ |
| `env-validate` | `zod-env`, `env-validation`    | Zod env validation + `check-env` script + typed env helper   |

### Testing

| Skill        | Aliases         | What it sets up                                              |
| ------------ | --------------- | ------------------------------------------------------------ |
| `vitest`     | `test`, `tests` | Vitest unit testing + coverage + example test               |
| `playwright` | `e2e`           | Playwright E2E tests + CI workflow + example spec            |

### DevOps / Infra

| Skill            | Aliases                    | What it sets up                                                    |
| ---------------- | -------------------------- | ------------------------------------------------------------------ |
| `dockerize`      | `docker`                   | Dockerfile + docker-compose + .dockerignore + health check         |
| `github-actions` | `ci`, `gh`, `github-ci`    | CI/CD workflow + test pipeline + Dependabot config                 |

---

### How to use

```bash
# See all available skills (grouped by category)
just-start-dude skills

# --- Database (SQL managed) ---
just-start-dude setup supabase
just-start-dude setup neon
just-start-dude setup planetscale
just-start-dude setup cockroachdb
just-start-dude setup turso
just-start-dude setup railway-postgres
just-start-dude setup xata

# --- Database (SQL local) ---
just-start-dude setup postgres        # Docker + Drizzle
just-start-dude setup mysql           # Docker + Drizzle
just-start-dude setup sqlite          # File-based, no Docker needed
just-start-dude setup timescaledb     # Time-series data

# --- Database (NoSQL / KV) ---
just-start-dude setup mongodb
just-start-dude setup upstash-redis
just-start-dude setup firebase-firestore
just-start-dude setup redis-local     # Docker Redis + ioredis
just-start-dude setup dynamodb        # AWS DynamoDB + local emulator

# --- ORM ---
just-start-dude setup prisma
just-start-dude setup drizzle

# --- Auth & UI ---
just-start-dude setup clerk
just-start-dude setup oauth
just-start-dude setup shadcn

# --- AI / ML ---
just-start-dude setup openai
just-start-dude setup pinecone
just-start-dude setup qdrant

# --- Payments ---
just-start-dude setup stripe
just-start-dude setup lemonsqueezy

# --- Email ---
just-start-dude setup resend
just-start-dude setup postmark

# --- Observability & Analytics ---
just-start-dude setup sentry
just-start-dude setup posthog
just-start-dude setup plausible

# --- Background Jobs ---
just-start-dude setup bullmq
just-start-dude setup inngest
just-start-dude setup trigger-dev

# --- Search ---
just-start-dude setup meilisearch
just-start-dude setup typesense

# --- Storage ---
just-start-dude setup s3-storage
just-start-dude setup cloudflare-r2
just-start-dude setup minio

# --- Developer Tools ---
just-start-dude setup env-validate

# --- Testing ---
just-start-dude setup vitest
just-start-dude setup playwright

# --- DevOps / Infra ---
just-start-dude setup dockerize
just-start-dude setup github-actions

# Target a specific directory
just-start-dude setup stripe --dir /path/to/your-project
just-start-dude setup postgres -d ../my-app
```

---

## 💡 Example prompts

```bash
just-start-dude create "a Twitter clone with posts, likes, and follows"
just-start-dude create "a Python ML API that classifies images"
just-start-dude create "a Notion-like note taking app with markdown support"
just-start-dude create "a CLI tool that converts CSV files to different formats"
just-start-dude create "a Chrome extension that summarizes YouTube videos"
just-start-dude create "a real-time chat app with rooms and file sharing"
```

---

## 🤝 Contributing

PRs welcome! Check out [CONTRIBUTING.md](./CONTRIBUTING.md).

Some ideas:

- Add more templates (Flutter, Rust, Go, Django, Rails)
- Add more skills (Cloudinary, Twilio, Pusher, Algolia)
- VS Code extension
- Web UI / dashboard

---

## 📄 License

MIT © [shayomi](https://github.com/shayomi)

---

<p align="center">
  Built with ❤️ and Claude AI
  <br>
  <a href="https://github.com/shayomi/start-something/issues">Report Bug</a> · 
  <a href="https://github.com/shayomi/start-something/issues">Request Feature</a>
</p>
