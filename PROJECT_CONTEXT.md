
# PROJECT_CONTEXT.md
> Architectural source of truth. Consult before any change. Update when architecture evolves.

---

## Overview

**T-Shirt Design Platform** — full-stack monorepo where users (registered or guest) design custom t-shirts, add them to a cart, and pay via MercadoPago.

---

## Monorepo Structure

```
tshirt-platform/
├── apps/
│   ├── api/          # NestJS 11 backend  (port 3001)
│   └── web/          # Next.js 15 frontend (port 3000)
├── packages/
│   └── shared/       # Shared TS types + Zod validators
├── turbo.json        # Turborepo pipeline
└── package.json      # pnpm workspaces (packageManager: pnpm@9)
```

**Build system**: Turborepo (`turbo run build`) with pnpm workspaces.
**Build order enforced**: `^build` dependency means `shared` builds before `api`/`web`.

---

## Backend API (`apps/api`)

### Tech Stack
| Concern | Library |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5.5 |
| ORM | Prisma 6 + PostgreSQL |
| Auth | `@nestjs/jwt` + `@nestjs/passport` (JWT strategy) |
| Validation | `class-validator` + `class-transformer` (DTOs) + Zod (env) |
| Payments | MercadoPago v2 |
| Storage | Abstracted (`StorageService` interface) — local impl in dev |
| Security | Helmet, express-rate-limit, bcryptjs (rounds=12) |

### Build Script
```json
"build": "prisma generate && nest build"
```
`prisma generate` **must** run before `nest build` so `@prisma/client` exports all enums and types. The TypeScript compiler fails otherwise.

### API Prefix
All routes are served under `/api/v1`.

### Environment Variables (validated via Zod at startup)
```
NODE_ENV                    development | production | test
PORT                        3001
DATABASE_URL                postgres://...
JWT_SECRET                  ≥16 chars
JWT_EXPIRES_IN              15m (default)
JWT_REFRESH_SECRET          ≥16 chars
JWT_REFRESH_EXPIRES_IN      7d (default)
FRONTEND_URL                http://localhost:3000
API_URL                     http://localhost:3001
STORAGE_ENDPOINT            (optional — for S3)
STORAGE_ACCESS_KEY          (optional)
STORAGE_SECRET_KEY          (optional)
STORAGE_BUCKET              (optional)
STORAGE_PUBLIC_URL          (optional)
MERCADOPAGO_ACCESS_TOKEN    (optional)
```

### Global Setup (`main.ts`)
- `helmet()` with `crossOriginResourcePolicy: cross-origin`
- JSON body limit: 10MB
- `ValidationPipe` with `whitelist: true`, `transform: true`
- `GlobalExceptionFilter` — all exceptions → structured JSON
- CORS: whitelisted to `FRONTEND_URL` (localhost:3000 + 127.0.0.1:3000)

---

## Source Tree (`apps/api/src`)

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts           # GET / health check
├── app.service.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   ├── guest-id.decorator.ts       # @GuestId() — reads X-Guest-Id header
│   │   └── roles.decorator.ts          # @Roles(UserRole.ADMIN)
│   ├── filters/
│   │   └── global-exception.filter.ts
│   └── guards/
│       ├── optional-jwt.guard.ts       # JWT that doesn't throw if token absent
│       └── roles.guard.guard.ts
│
├── infrastructure/
│   ├── config/
│   │   └── env.validation.ts           # Zod env schema
│   ├── database/
│   │   └── prisma.service.ts           # PrismaClient singleton
│   └── storage/
│       ├── storage.interface.ts        # Abstract StorageService
│       └── local-storage.service.ts    # Local FS implementation
│
└── modules/
    ├── auth/          # POST /auth/register|login|refresh
    ├── users/         # Internal user queries
    ├── products/      # GET /products, GET /products/:slug, POST /products (admin)
    ├── uploads/       # POST /uploads/presign|confirm, GET /uploads
    ├── drafts/        # POST /drafts (upsert), GET /active, PATCH|DELETE /:id
    ├── cart/          # GET /, POST /items, PATCH|DELETE /items/:id, POST /merge
    ├── orders/        # POST /from-cart (primary), POST / (legacy), GET /, PATCH /:id/status
    ├── payments/      # POST /preference/:orderId, POST /webhook
    └── admin/         # GET /orders, GET /orders/:id, PATCH /orders/:id/status
```

---

## Database Schema (Prisma)

Schema location: `apps/api/prisma/schema.prisma`

### Models

| Model | Key Fields | Notes |
|---|---|---|
| `User` | email, passwordHash, role (CUSTOMER\|ADMIN) | emailVerifiedAt nullable |
| `Product` | name, slug (unique), basePrice, isActive | |
| `ProductVariant` | productId, color, colorHex, size, additionalPrice, stockStatus | Unique: (productId, color, size) |
| `Upload` | userId, s3Key (unique), mimeType, sizeBytes, status, zone | PENDING→VALIDATED→REJECTED |
| `Mockup` | uploadId, s3Key, status | QUEUED→PROCESSING→READY→FAILED |
| `DraftDesign` | guestId?, userId?, productId, variantId, zonesData(JSON), uploadIds(JSON), previewS3Key, status, expiresAt | Guest TTL: 30 days |
| `Cart` | guestId? (unique), userId? (unique), expiresAt | Guest TTL: 30 days |
| `CartItem` | cartId, draftDesignId?, variantId, quantity, unitPriceSnapshot | |
| `Order` | userId?, guestId, guestEmail, status, subtotal, total, shippingAddress(JSON) | |
| `OrderItem` | orderId, productVariantId, uploadId?, quantity, unitPrice, customizations(JSON) | |
| `Payment` | orderId (unique), provider, providerPaymentId, status, amount | |
| `PrintJob` | orderId (unique), status, trackingNumber, trackingUrl | |
| `RefreshToken` | userId, tokenHash (unique), expiresAt, userAgent, ipAddress | |

### Enums (all exported from `@prisma/client` after `prisma generate`)
```
UserRole        CUSTOMER | ADMIN
TShirtSize      XS | S | M | L | XL | XXL
StockStatus     AVAILABLE | OUT_OF_STOCK
UploadStatus    PENDING | VALIDATED | REJECTED
PrintZone       FRONT | BACK | TAG
MockupStatus    QUEUED | PROCESSING | READY | FAILED
OrderStatus     DRAFT | CONFIRMED | PAID | IN_PRODUCTION | SHIPPED | DELIVERED | CANCELLED
PaymentStatus   PENDING | APPROVED | REJECTED | CANCELLED
JobStatus       PENDING | SUBMITTED | IN_PROGRESS | COMPLETED | FAILED
DraftStatus     ACTIVE | CONVERTED | EXPIRED
```

---

## Key Workflows

### 1. Guest vs Authenticated Access
- Guests identified via `X-Guest-Id` header (UUID generated client-side).
- `OptionalJwtGuard` accepts both authenticated and unauthenticated requests.
- On login: `POST /cart/merge` moves guest cart items to user cart; drafts ownership transferred.

### 2. Design → Cart → Order
```
DraftDesign (ACTIVE)
  → POST /cart/items (addToCart)
      → DraftDesign marked CONVERTED
      → CartItem created with unitPriceSnapshot
  → POST /orders/from-cart
      → Server re-validates all cart items (price, stock, upload)
      → Order created with status CONFIRMED (auto-confirmed)
      → CartItems removed
  → POST /payments/preference/:orderId
      → MercadoPago preference created
      → Redirect to MP checkout
  → POST /payments/webhook
      → approved → Order.status = PAID, Payment.status = APPROVED
```

### 3. Order Status Transitions
**Customer-allowed**: `CONFIRMED → CANCELLED` only.
**Admin-allowed** (full control):
```
DRAFT        → CONFIRMED | CANCELLED
CONFIRMED    → PAID | CANCELLED
PAID         → IN_PRODUCTION | CANCELLED
IN_PRODUCTION → SHIPPED | CANCELLED
SHIPPED      → DELIVERED
DELIVERED    → (terminal)
CANCELLED    → (terminal)
```
On `IN_PRODUCTION`: `PrintJob` auto-created.
On `SHIPPED`: `PrintJob` updated with tracking number.

### 4. Auth & Token Rotation
- Access token: 15m expiry, signed with `JWT_SECRET`.
- Refresh token: 7d expiry, **hashed** in DB, signed with `JWT_REFRESH_SECRET`.
- Refresh rotates: old token deleted, new pair issued.
- One session per user (single refresh token stored).

### 5. Price Integrity
- `unitPriceSnapshot` captured on `CartItem` creation.
- `currentUnitPrice` always recalculated live from `product.basePrice + variant.additionalPrice`.
- `priceChanged` flag returned to frontend; order creation re-validates from DB.

---

## Shared Package (`packages/shared`)

### Exported Types
`UserRole`, `OrderStatus`, `UploadStatus`, `PrintZone`, `MockupStatus`, `PaymentStatus`,
`ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`

### Exported Zod Schemas + Inferred Types
`registerSchema` / `RegisterDto`
`loginSchema` / `LoginDto`
`uploadConfirmSchema` / `UploadConfirmDto`
`createOrderSchema` / `CreateOrderDto`

---

## Frontend (`apps/web`)

**Stack**: Next.js 15, React 19, Tailwind CSS 4, Lucide icons.
Calls backend at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).

---

## Coding Conventions

- **DTOs**: `class-validator` decorators on all input DTOs. Never trust raw body.
- **Services**: All business logic in services, controllers are thin.
- **Prisma**: Always import model types and enums from `@prisma/client` (generated).
- **Storage**: Never import `LocalStorageService` directly — inject `StorageService` interface.
- **Guards**: Use `@UseGuards(JwtAuthGuard)` for required auth, `OptionalJwtGuard` for guest+user routes.
- **Errors**: Throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.) — `GlobalExceptionFilter` formats them.
- **Logging**: Use `new Logger(ClassName.name)` per service.
- **Admin routes**: Protected by `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`.

---

## Deployment (Railway)

- **Build command**: `pnpm --filter @tshirt/api build` → runs `prisma generate && nest build`
- **Start command**: `node apps/api/dist/main` (or `pnpm --filter @tshirt/api start`)
- **Required env vars at runtime**: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `API_URL`
- **Migrations**: Run `prisma migrate deploy` against `DATABASE_URL` before first start (Railway release command or manual).
- No Dockerfile — Railway uses Nixpacks with Node 20.
>>>>>>> claude/sleepy-feynman
