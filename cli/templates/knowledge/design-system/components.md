# Engineering Standards

## Project Structure

```
src/
├── index.ts          # Entry point — Express app setup + routes
├── models.ts         # Domain types, storage, CRUD operations
└── validators.ts     # Request validation functions
tests/
└── *.test.ts         # One test file per source module
```

## Naming Conventions

- Files: kebab-case (`todo-service.ts`, `user-repository.ts`)
- Types/Interfaces: PascalCase (`Todo`, `ValidationError`)
- Functions: camelCase (`findAll`, `findById`, `validateCreate`)
- Constants/enums: UPPER_SNAKE_CASE for values, PascalCase for type

## Error Handling Pattern

- Validation: return `{ field, message }[]` from validator functions
- Not found: return `undefined` from finder functions, caller returns 404
- Never throw in route handlers — catch and return error JSON
- Use HTTP status codes semantically

## Testing Standards

- Test models directly (unit tests against in-memory store)
- Test validators with valid and invalid bodies
- Use vitest with describe/it/expect
