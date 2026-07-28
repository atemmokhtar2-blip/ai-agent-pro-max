# Railway Deployment Guide

## Quick Setup

1. **Create a new Railway project** at [railway.com](https://railway.com)
2. **Connect your GitHub repo** (push this code to GitHub first)
3. **Add a PostgreSQL database** via Railway → New → Database → PostgreSQL
   - Railway auto-injects `DATABASE_URL` into your service
4. **Set environment variables** in your Railway service settings:

```
JWT_SECRET=<run: openssl rand -hex 32>
JWT_REFRESH_SECRET=<run: openssl rand -hex 32>
ENCRYPTION_KEY=<run: openssl rand -hex 32>
PROVIDER_ENCRYPTION_KEY=<run: openssl rand -hex 32>
OPENROUTER_API_KEY=<your key from openrouter.ai/keys>
NODE_ENV=production
```

5. **Deploy** — Railway auto-builds and starts the app using `nixpacks.toml`

## How it works in production

- The API server (`artifacts/api-server`) builds to `dist/index.mjs`
- The frontend (`artifacts/ai-agent`) builds to `artifacts/ai-agent/dist/public/`
- In production, the **API server serves the frontend as static files** (single process, one port)
- All `/api/v1/*` routes are handled by Express; everything else serves the React SPA

## Build commands (auto-detected via nixpacks.toml)

```bash
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/ai-agent run build
```

## Start command

```bash
PORT=$PORT NODE_ENV=production node --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

## Database migrations

On first deploy, the server auto-detects whether the schema exists:
- **Fresh DB** → runs Drizzle migrations automatically on startup
- **Existing schema** → skips migrations (schema already in sync)

To apply schema changes manually:
```bash
pnpm --filter @workspace/db run push
```

## Required environment variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (auto from Railway DB) | ✅ |
| `JWT_SECRET` | 32-byte hex — signs access tokens | ✅ |
| `JWT_REFRESH_SECRET` | 32-byte hex — signs refresh tokens | ✅ |
| `ENCRYPTION_KEY` | 32-byte hex — encrypts GitHub OAuth tokens | ✅ |
| `PROVIDER_ENCRYPTION_KEY` | 32-byte hex — encrypts AI provider keys | ✅ |
| `OPENROUTER_API_KEY` | For LLM features (openrouter.ai/keys) | Optional |
| `NODE_ENV` | Set to `production` | ✅ |
