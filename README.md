# NestJS Monorepo Boilerplate

Production-ready NestJS boilerplate with a React frontend, Docker, PostgreSQL, Objection.js ORM, and Knex migrations.

## Structure

- `apps/api` - NestJS API
- `apps/web` - Vite + React frontend

## Features

- Dockerized API + Postgres
- Global error handling with consistent responses
- Global HTTP request logging + request ID (`x-request-id`)
- Config module with validation (Joi)
- Objection.js ORM with Knex (migrations included)
- DTO validation, enums, and utilities
- Health check endpoint
- Prometheus metrics endpoint
- Winston logging with daily rotation and retention
- ESLint + Prettier
- Unit tests for API and web
- Swagger docs for API endpoints
- Outbound HTTP client with request ID propagation
- Database seeding
- Centralized error codes (1xxxx backend, 2xxxx database, 3xxxx external)
- pgAdmin for database administration
- Host-mounted logs with per-error trace files

## Getting Started

Requires Node.js 24+ (or use Docker).

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
```

### Run locally

```bash
npm run dev
npm run dev:web
```

If the API runs outside Docker while Postgres is in Docker, set `DB_HOST=localhost` and `DB_PORT=10003` in `apps/api/.env`.

### Run with Docker

```bash
docker compose up --build
```

This builds and serves the web app via Nginx.

### Run with Docker (hot reload)

```bash
docker compose -f docker-compose-dev.yml up
```

`docker-compose.yml` uses `apps/api/.env`. `docker-compose-dev.yml` uses `apps/api/.env.dev`.

### Default ports

- API: `http://localhost:10001`
- Web: `http://localhost:10002`
- Postgres: `localhost:10003` (container `5432`)
- pgAdmin UI: `http://localhost:10004`
- API base path: `/api/v1`

pgAdmin credentials come from `apps/api/.env` or `apps/api/.env.dev`.
Default server template is in `pgadmin/servers.json` and is rendered from env on container start.
Logs are stored on the host at `./storage/logs` with per-error traces in `./storage/logs/traces` (trace retention follows `LOG_RETENTION_DAYS`).
On container start, migrations run automatically (controlled by `RUN_MIGRATIONS_ON_STARTUP`).

### Database migrations

```bash
npm run migration:latest -w @app/api
npm run migration:rollback -w @app/api
```

### Database seeding

```bash
npm run seed:run -w @app/api
```

### Lint / Format / Test

```bash
npm run lint
npm run format
npm run test
```

Backend auto-format while editing:

```bash
npm run format:watch
```

## API Endpoints

- `GET /api/v1/` - Basic app status
- `GET /api/v1/users` - List users (supports `page` and `limit` query params)
- `GET /api/v1/users/:id` - Fetch user by ID
- `POST /api/v1/users` - Create user
- `POST /api/v1/users/:id/image` - Upload user image (multipart `file`)
- `GET /api/v1/health` - Health check
- `GET /api/v1/metrics` - Prometheus metrics
- `GET /api/v1/docs` - Swagger UI

## Error Codes

Responses include a stable `errorCode` and `error` name. Ranges:

- `1xxxx` backend/business errors
- `2xxxx` database errors
- `3xxxx` external service errors

Example error response:

```json
{
  "statusCode": 404,
  "errorCode": 10010,
  "error": "USER_NOT_FOUND",
  "message": "User not found",
  "details": {
    "userId": "b9f8f1b2-2c0e-4c0b-8b7b-1f4f6c7b5d12"
  },
  "timestamp": "2024-06-20T10:00:00.000Z",
  "path": "/api/v1/users/b9f8f1b2-2c0e-4c0b-8b7b-1f4f6c7b5d12",
  "requestId": "7b9a2a0b-3d74-4f68-8c72-7c9b45a8213f"
}
```

Use the centralized error codes with `AppException`:

```ts
throw new AppException(ERROR_CATALOG.USER_NOT_FOUND, 'User not found', { userId });
```

## Example Payloads

Create user:

```json
{
  "email": "user@example.com",
  "name": "Sample User",
  "role": "user"
}
```

## Environment

Key variables in `apps/api/.env`:

- `NODE_ENV`
- `PORT`
- `API_PREFIX`
- `APP_NAME`
- `LOG_LEVEL`
- `LOG_DIR`
- `LOG_RETENTION_DAYS`
- `UPLOAD_DIR`
- `RUN_MIGRATIONS_ON_STARTUP`
- `MIGRATION_MAX_ATTEMPTS`
- `MIGRATION_RETRY_DELAY_SECONDS`
- `SWAGGER_ENABLED`
- `SWAGGER_PATH`
- `HTTP_TIMEOUT`
- `HTTP_MAX_REDIRECTS`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_DEBUG`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`
- `PGADMIN_SERVER_NAME`
- `PGADMIN_SERVER_GROUP`
- `PGADMIN_SERVER_HOST`
- `PGADMIN_SERVER_PORT`

Key variables in `apps/web/.env`:

- `VITE_API_URL`

## Outbound HTTP usage

Inject `HttpClientService` from `apps/api/src/http/http-client.service.ts` to make requests with timeout, redirects, logging, and automatic `x-request-id` propagation.

## Request lifecycle

```
Incoming request
  → request-id middleware (sets req.requestId + response header, starts async context)
  → interceptor starts timer
  → controller/handler runs
     → outbound HTTP uses requestId from context
  → interceptor logs response duration
  → response returned
```

On error:

```
... handler throws
  → exception filter normalizes error + writes trace file
  → interceptor logs error duration
  → response returned with errorCode + requestId
```

## File uploads (filesystem)

User images are stored on disk and the DB stores `imagePath`. In Docker, uploads persist under `./storage/uploads` mounted to `/app/uploads`. Allowed types: JPEG/PNG/GIF/WEBP; max size: 5 MB.
