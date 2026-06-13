# API Conventions

## REST Endpoint Design

- Base path: `/api/v1/`
- Resource URLs: plural nouns, kebab-case (`/api/v1/todos`, `/api/v1/todo-items`)
- HTTP methods:
  - `GET /api/v1/{resource}` — list all items
  - `GET /api/v1/{resource}/:id` — single item
  - `POST /api/v1/{resource}` — create
  - `PATCH /api/v1/{resource}/:id` — partial update
  - `DELETE /api/v1/{resource}/:id` — remove

## Response Format

- Envelope: `{ data: ... }` for single item, `{ data: [...], meta: { total } }` for lists
- On error: `{ error: string, fields?: [{ field, message }] }`
- Status codes: 200 (ok), 201 (created), 204 (deleted), 400 (validation), 404 (not found)

## Conventions

- All request/response bodies are JSON (`Content-Type: application/json`)
- IDs are UUID v4 strings
- Timestamps in ISO 8601 format
