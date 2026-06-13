# Domain Model

## Core Entities

### User
- id: UUID (primary key)
- email: string (unique)
- name: string
- role: enum [admin, member, viewer]
- createdAt: datetime
- updatedAt: datetime

### Order
- id: UUID (primary key)
- userId: UUID (foreign key → User)
- status: enum [pending, confirmed, shipped, delivered, cancelled]
- totalAmount: decimal
- createdAt: datetime
- updatedAt: datetime

### Product
- id: UUID (primary key)
- name: string
- price: decimal
- inventory: integer
- categoryId: UUID (foreign key → Category)

## Relationships
- User 1:N Order
- Order N:M Product (through OrderItem)
- Product N:1 Category

## Business Rules
- Soft delete: all entities use `deletedAt` column, queries MUST include `WHERE deleted_at IS NULL`
- Order cancellation only allowed when status is 'pending'
- Inventory count must never go below 0
