# T-Shirt Platform

B2C print-on-demand platform.
Users can:
- Select base product
- Customize design
- Add to cart
- Checkout
- Save drafts

Not a marketplace.
Users print their own designs only.

Frontend:
- Next.js (App Router)
- TypeScript
- Tailwind

Backend:
- NestJS
- Prisma
- PostgreSQL

Infra:
- Railway deployment
- Stripe payments
- S3-compatible storage

- DraftDesign is separate from Cart
- Cart is server-side only
- Price is always validated server-side
- No business logic in frontend
- All DTOs use class-validator
- All endpoints require explicit guards
- Never trust client data

Entities:
- User
- DraftDesign
- Cart
- CartItem
- Order
- OrderItem
- Payment

Order lifecycle:
PENDING → PAID → IN_PRODUCTION → SHIPPED → DELIVERED

- JWT with refresh tokens
- HTTP-only cookies
- Rate limiting on auth & uploads
- Stripe webhook signature validation
- Server-side price calculation

- Strict TypeScript
- No any
- Modular architecture
- Service layer required
- Controllers thin
- Use dependency injection properly

