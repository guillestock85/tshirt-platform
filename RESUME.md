# remera.design — Session Resume

> Last updated: 2026-03-02 (session 3)
> Platform: B2C print-on-demand (t-shirt customization) — Argentine market (MercadoPago / ARS)

---

## Project Overview

End-user focused print-on-demand platform. Users pick a t-shirt, design it (upload + text), add to cart and checkout — no account required. Target: 10,000 orders/month.

**Stack**
- Monorepo: `pnpm` workspaces + Turborepo
- API: NestJS 11 + Prisma + PostgreSQL (`apps/api`)
- Web: Next.js 15 App Router (`apps/web`)
- Payments: MercadoPago (Preference API + webhooks)
- Storage: Cloudflare R2 (S3-compatible, presigned uploads)
- Auth: JWT (access 15m + refresh 7d) + guest sessions via `X-Guest-Id` header

**Key URLs (dev)**
- Frontend: `http://localhost:3000` (or `http://127.0.0.1:3000` in preview)
- API: `http://localhost:3001/api/v1`
- DB: PostgreSQL on `localhost:5432/tshirt_platform`

---

## Architecture Decisions

### Guest Checkout
- Users can complete the entire flow without an account
- A `guestId` (UUID) is generated client-side in `localStorage` and sent as `X-Guest-Id` header on every request
- Orders, carts and drafts can all belong to a guest
- On login/register, guest cart is merged into the user's cart via `POST /cart/merge`

### Server-Side Cart & Draft
- **DraftDesign** model: canvas state (layers per zone), uploadIds, variant, quantity — saved server-side with 2s debounce autosave
- **Cart / CartItem** model: price snapshotted at add-to-cart time; re-validated at order creation
- No client-trusted prices or variant data — everything re-fetched from DB at order time

### Price Validation Flow
```
Add to cart  → unitPriceSnapshot = basePrice + additionalPrice (from DB)
Create order → re-fetch price from DB, reject if variant is OUT_OF_STOCK
```

### CORS (important quirk)
- Preview browser opens on `http://127.0.0.1:3000`, not `http://localhost:3000`
- `main.ts` builds an `allowedOrigins` array with both variants
- `helmet` is configured with `crossOriginResourcePolicy: { policy: 'cross-origin' }`

### Worktree vs Main Project (important!)
- Development runs in a **git worktree** at `.claude/worktrees/optimistic-nobel/`
- BUT the worktree has **no `node_modules`**, so pnpm resolves packages from the **main project root**
- This means `nest start --watch` compiles from **`apps/api/src/`** in the **main project**, not the worktree
- **Always edit files in `C:\projects\tshirt-platform\`**, not in the worktree copy
- The worktree's web (`apps/web/`) IS served correctly by Next.js

---

## Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `User` | Authenticated users (CUSTOMER / ADMIN roles) |
| `RefreshToken` | JWT refresh tokens |
| `Product` | Product catalogue (name, slug, basePrice) |
| `ProductVariant` | Color + size variants, additionalPrice, stockStatus |
| `DraftDesign` | Canvas state per zone (FRONT/BACK/TAG), auto-saved, guest or user |
| `Cart` | Guest or user cart (one per identity) |
| `CartItem` | Line item linking draft → cart, with price snapshot |
| `Upload` | File uploads (PENDING → VALIDATED → REJECTED) |
| `Order` | Guest or user orders (nullable userId + guestId + guestEmail) |
| `OrderItem` | Line items with re-validated price |
| `Payment` | MercadoPago payment records |
| `Mockup` | Generated product mockup images |
| `PrintJob` | Fulfillment records |

**Key schema notes:**
- `Order.userId` is **nullable** — guest orders have only `guestId` + `guestEmail`
- `DraftDesign.zonesData` is JSON: `{ FRONT?: Layer[], BACK?: Layer[], TAG?: Layer[] }`
- `DraftDesign.uploadIds` is JSON: `{ FRONT?: uploadId, BACK?: uploadId, TAG?: uploadId }`

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Register + auto-login |
| POST | `/auth/login` | public | Login |
| POST | `/auth/refresh` | public | Refresh JWT |
| GET | `/products` | public | List active products with variants |
| GET | `/products/:slug` | public | Product detail |
| POST | `/drafts` | optional | Create/upsert draft (autosave) |
| GET | `/drafts/active?productId=` | optional | Get active draft |
| PATCH | `/drafts/:id` | optional | Update draft |
| DELETE | `/drafts/:id` | optional | Abandon draft |
| GET | `/cart` | optional | Get cart with enriched items |
| POST | `/cart/items` | optional | Add draft to cart |
| PATCH | `/cart/items/:id` | optional | Update quantity |
| DELETE | `/cart/items/:id` | optional | Remove item |
| POST | `/cart/merge` | JWT | Merge guest cart into user cart |
| POST | `/orders/from-cart` | optional | Create order from cart (validates everything) |
| GET | `/orders` | JWT | User's order history |
| GET | `/orders/:id` | JWT | Order detail |
| POST | `/orders/:id/cancel` | JWT | Cancel order |
| POST | `/payments/preference/:orderId` | optional | Create MercadoPago preference |
| POST | `/payments/webhook` | public | MercadoPago webhook |
| POST | `/uploads/presign` | JWT | Get S3 presigned URL |
| POST | `/uploads/confirm` | JWT | Confirm upload after S3 |
| GET | `/admin/orders` | ADMIN | All orders |
| PATCH | `/admin/orders/:id/status` | ADMIN | Update order status |

---

## Frontend Pages

| Route | Description | Status |
|-------|-------------|--------|
| `/` | B2C landing page — hero, steps, CTA | ✅ Done |
| `/crear` | Step 1: Product picker (t-shirt grid) | ✅ Done |
| `/design?productId=UUID` | Step 2: Design editor (upload + text + autosave) | ✅ Done |
| `/checkout` | Step 3: Guest email + shipping + cart review → MP | ✅ Done |
| `/checkout/success` | Post-payment landing (approved / pending states) | ✅ Done |
| `/catalogo` | Public product catalogue | ✅ Done |
| `/login` | Auth page | ✅ Done |
| `/register` | Registration page | ✅ Done |
| `/pedidos` | User order history | ✅ Done |
| `/cuenta` | Account settings | ✅ Done |
| `/dashboard` | Legacy dashboard (B2B remnant) | ⚠️ Keep or remove |

---

## Completed Tasks

1. **Autosave error fix** — NestJS body limit raised to 10MB; base64 image content stripped from `zonesData` before saving to server; restored layers skip empty-content image layers
2. **B2C landing page** (`/`) — standalone, no AppShell, purple hero, 3-step explainer, trust signals
3. **Guest checkout backend** — `Order.userId` made nullable; added `guestId`/`guestEmail` fields; migration `20260302161630_guest_order_support`
4. **Guest-aware order creation** — `POST /orders/from-cart` with `OptionalJwtAuthGuard`, auto-confirms order status
5. **Guest-aware payment** — `POST /payments/preference/:orderId` with `OptionalJwtAuthGuard`; MercadoPago payer uses `guestEmail` fallback
6. **MercadoPago back_urls** — updated to point to `/checkout/success?external_reference=...&collection_status=...`
7. **New checkout page** — standalone, no auth redirect, guest email field, cart summary from `GET /cart`
8. **Success page** (`/checkout/success`) — reads MP redirect params, shows order ID and next steps
9. **`/crear` product picker** — standalone, step bar, product grid with TshirtSVG
10. **CORS fix** — `Cross-Origin-Resource-Policy: cross-origin`; origin callback allowing both `localhost:3000` and `127.0.0.1:3000`; `X-Guest-Id` in allowed headers
11. **`useAutosave` PATCH bug** — removed `productId` from PATCH body (rejected by `UpdateDraftDto` with `forbidNonWhitelisted`); POST body keeps it
12. **Guest cart flow** — removed unnecessary `isAuthenticated` check from `handleAddToCart`; `POST /cart/items` already supports guests via `X-Guest-Id`; guests go straight to checkout
13. **TypeScript** — fixed `ringColor` invalid CSS property in `/crear/page.tsx`; web tsc reports 0 errors
14. **End-to-end flow verified** — Landing → /crear → design editor (text layer, autosave "Guardado") → "Agregar al carrito" → /checkout (no auth) → cart summary with item and price ✅
15. **Guest upload UX** — "Subir imagen" button now checks auth before opening file picker; shows "Iniciá sesión para subir imágenes" tooltip for guests; canvas placeholder shows "Subir imagen (requiere cuenta)"
16. **More seed products** — Added `POST /products/seed/all` endpoint; seeds Remera Clásica + Remera Oversize ($5.500) + Buzo con Capucha ($9.500); /crear product picker now shows all 3 ✅

---

## Pending Tasks

### High Priority
- [x] **Design editor `handleAddToCart`** — done, calls `POST /cart/items` then redirects
- [x] **`useAutosave` hook** — done, debounce + flushSave + restore on mount
- [x] **Cart merge on login** — done in `AuthContext.login()`
- [x] **Checkout load cart** — done, reads from `GET /cart`

### Medium Priority
- [x] **Product seed data** — `POST /products/seed/all` creates 3 products (Remera Clásica, Remera Oversize, Buzo con Capucha)
- [x] **Upload validation for guests** — Option B: login required for uploads; auth modal shown on button click; tooltip shown for guests
- [ ] **Order email confirmation** — send email to `guestEmail` or `user.email` after order is created (no email service configured yet)
- [ ] **MercadoPago webhook handler** — `handleWebhook` in `payments.service.ts` needs to update `Order.status` and `Payment.status` on approval

### Low Priority / Polish
- [ ] **Price display** — format ARS currency consistently (e.g., `Intl.NumberFormat`)
- [ ] **Mobile responsiveness** — design editor is desktop-only; checkout/crear could be mobile-friendly
- [ ] **`/dashboard` cleanup** — old B2B dashboard; either repurpose as user order history or remove
- [ ] **Admin panel** — basic order management UI (currently API-only)
- [ ] **Error boundaries** — checkout and design pages need graceful error states

---

## Next Actions (pick up here)

### 1. Configure MercadoPago sandbox and test payment
- Set `MERCADOPAGO_ACCESS_TOKEN` in `apps/api/.env` to a TEST token (from MP developer dashboard)
- Fill out checkout form → click "Pagar con MercadoPago" → should redirect to MP
- Use MP sandbox test cards to complete payment
- Should return to `/checkout/success` with order ID

### 2. Order email confirmation
- No email service configured yet
- After `POST /orders/from-cart`, send confirmation to `guestEmail` or `user.email`
- Recommended: integrate Resend (simple API, generous free tier) with a transactional template

### 3. Admin panel UI
- Backend endpoints exist (`GET /admin/orders`, `PATCH /admin/orders/:id/status`)
- Need a simple frontend page at `/admin/orders` (list + status update dropdown)
- Protect with role check (ADMIN only)

---

## Commands to Run

```bash
# Start both servers (from worktree OR main project root)
pnpm --filter web dev          # Next.js on :3000
pnpm --filter @tshirt/api dev  # NestJS on :3001

# Database
pnpm --filter @tshirt/api exec prisma migrate dev    # run pending migrations
pnpm --filter @tshirt/api exec prisma studio         # DB GUI at :5555
pnpm --filter @tshirt/api exec prisma db seed        # seed if configured

# Seed all products (Remera Clásica + Remera Oversize + Buzo con Capucha) — idempotent
curl -X POST http://localhost:3001/api/v1/products/seed/all

# Type-check
pnpm --filter @tshirt/api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit

# Kill stuck port 3001 (Windows PowerShell)
$c = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($c) { Stop-Process -Id $c.OwningProcess -Force }
```

---

## Environment Variables

### `apps/api/.env`
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tshirt_platform"
JWT_SECRET="change-this-to-a-random-secret-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="change-this-to-another-random-secret"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
MERCADOPAGO_ACCESS_TOKEN=""   # ← fill from MP developer dashboard
API_URL="http://localhost:3001"
STORAGE_ENDPOINT=""           # ← Cloudflare R2 endpoint
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_BUCKET=""
STORAGE_PUBLIC_URL=""
```

### `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Known Quirks

| Issue | Details |
|-------|---------|
| **Worktree has no node_modules** | `pnpm` resolves from main project. Edit files in `C:\projects\tshirt-platform\`, not in the worktree copy |
| **Port 3001 EADDRINUSE on hot-reload** | NestJS watch tries to restart while old process still alive. Use the PowerShell kill command above |
| **Preview browser uses 127.0.0.1** | Fixed in `main.ts` CORS config — both `localhost` and `127.0.0.1` are allowed |
| **Base64 autosave** | Image layer `content` (dataUrl) is stripped before saving to API; re-fetched from S3 via `previewS3Key` |
| **MercadoPago sandbox** | Set `MERCADOPAGO_ACCESS_TOKEN` to a TEST token; use MP sandbox cards for testing |
