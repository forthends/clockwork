# API Conventions

## REST Endpoint Design
- URLs: kebab-case, plural nouns (`/api/users`, `/api/order-items`)
- Version prefix: `/api/v1/`
- HTTP methods: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove)

## Request/Response Format
- Content-Type: application/json
- Envelope: `{ data: ..., error: ..., meta: { page, pageSize, total } }`
- Timestamps: ISO 8601 in UTC
- Pagination: query params `page` (1-based) and `pageSize` (default 20, max 100)

## Error Handling
- 400: Validation errors — return field-level error details
- 401: Missing or invalid authentication
- 403: Authenticated but not authorized
- 404: Resource not found
- 500: Unexpected server error — never expose stack traces

## Authentication
- JWT tokens in Authorization header: `Bearer <token>`
- Token refresh endpoint: POST /api/v1/auth/refresh
