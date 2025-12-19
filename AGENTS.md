# AGENTS

This repository is a monorepo with an API and a web frontend. Use the guidelines below to keep the codebase consistent and production-ready.

## Protocol (Plan–Act–Verify)

- Use Plan–Act–Verify for non-trivial changes.
- Keep plans short and update them after each completed step.
- Prefer small, focused commits and avoid unrelated edits.

## Repository Structure

- `apps/api`: NestJS API service.
- `apps/web`: Vite + React frontend.
- `apps/api/migrations`: Knex migrations (immutable once merged).
- `apps/api/seeds`: Knex seeds.
- `storage/uploads`: Host-mounted uploads (Docker).
- `storage/logs`: Host-mounted logs (Docker).
- `pgadmin`: pgAdmin templates/entrypoint.

## Code Style & Conventions

- TypeScript strict mode; avoid `any`.
- Keep modules cohesive and follow NestJS dependency injection patterns.
- Use DTOs for input validation and annotate with Swagger.
- Prefer explicit error handling over silent failures.

## Error Handling

- Centralize error codes in `apps/api/src/common/errors/error-catalog.ts`.
- Throw `AppException` with an error definition and a message:
  - `throw new AppException(ERROR_CATALOG.USER_NOT_FOUND, 'User not found', details)`
- Global errors are normalized in `AllExceptionsFilter` and include `errorCode`, `error`, `message`, and `details`.

## Logging

- Application logs: Winston + daily rotate; configured via env in `apps/api/.env`.
- Trace logs: written per non-2xx error to `logs/traces` with timestamp + request ID.
- Do not log secrets or PII; keep messages short and actionable.

## Database

- Use Knex migrations; never edit existing migrations.
- New schema changes go in a new migration under `apps/api/migrations`.
- Update `UserModel`/DTOs consistently when schema changes.

## File Uploads (API)

- Uploads are stored on disk; DB stores `imagePath`.
- Validate IDs and file types; avoid path traversal.
- If DB update fails, remove the uploaded file.

## HTTP Client

- Use `HttpClientService` for outbound requests; it propagates `x-request-id` and logs requests.

## Swagger

- Annotate endpoints and DTOs so `/{API_PREFIX}/docs` stays accurate.

## Frontend

- `apps/web` is a minimal Vite + React app.
- Keep UI changes aligned with existing styles unless explicitly requested.

## Tooling

- Lint: `npm run lint`
- Format: `npm run format` (API: `npm run format:watch -w @app/api`)
- Test: `npm run test`

## Environment

- Keep `.env.example` updated when adding config.
- Keep `.env.dev` aligned with `.env` keys for docker-compose-dev.
- Docker runs migrations on startup unless `RUN_MIGRATIONS_ON_STARTUP=false`.
- Node 24+ is the runtime baseline.
