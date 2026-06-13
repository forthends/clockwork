# Domain Model

## Todo Entity

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| id | string (UUID) | auto | Unique identifier |
| title | string | yes | Short summary |
| description | string | no | Detailed notes, defaults to "" |
| status | TodoStatus | yes | One of: `todo`, `in_progress`, `done`. Default: `todo` |
| priority | number | no | Higher = more urgent. Default: 0 |
| createdAt | string (ISO 8601) | auto | Creation timestamp |
| updatedAt | string (ISO 8601) | auto | Last modification timestamp |

## Business Rules
- A new todo starts with status `todo` and priority 0 unless specified
- Status can be set to any valid value (`todo`, `in_progress`, `done`) at any time via PATCH
- Deleting a todo is permanent (no soft delete)
- Priority is used for sorting; higher values appear first in list responses
