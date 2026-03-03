import { clearAuth } from '@/lib/auth'
import { getGuestId } from '@/lib/guest'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()

  const guestId = getGuestId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Always send guest ID so server can associate guest sessions and merge on login
    ...(guestId ? { 'X-Guest-Id': guestId } : {}),
    ...(init.headers as Record<string, string>),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearAuth()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:required'))
    }
    throw new ApiError(401, 'No autorizado')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? 'Error en la solicitud')
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'CUSTOMER' | 'ADMIN'
}

export interface ProductVariant {
  id: string
  productId: string
  color: string
  colorHex: string
  size: string
  additionalPrice: number
  stockStatus: 'AVAILABLE' | 'OUT_OF_STOCK'
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  basePrice: number
  isActive: boolean
  variants: ProductVariant[]
}

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Payment {
  id: string
  status: PaymentStatus
  provider: string
  amount: number
  currency: string
}

export interface OrderItem {
  id: string
  productVariantId: string
  uploadId: string | null
  quantity: number
  unitPrice: number
  customizations: Record<string, string> | null
  productVariant: ProductVariant & { product: Product }
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  subtotal: number
  total: number
  currency: string
  shippingAddress: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
  }
  notes: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  payment: Payment | null
}

export interface PaymentPreference {
  preferenceId: string
  initPoint: string
  sandboxInitPoint: string
  externalReference: string
}

export interface PresignResult {
  url: string
  key: string
  expiresIn: number
}

export interface CartItemVariant {
  id: string
  color: string
  colorHex: string
  size: string
  product: { id: string; name: string; slug: string }
}

export interface CartItem {
  id: string
  draftDesignId: string | null
  variant: CartItemVariant
  quantity: number
  unitPriceSnapshot: number
  currentUnitPrice: number
  priceChanged: boolean
  uploadIds: Record<string, string>
  previewS3Key: string | null
}

export interface Cart {
  id: string
  items: CartItem[]
  subtotal: number
}

export interface DraftSaveResult {
  id: string
  expiresAt: string | null
}

export interface Upload {
  id: string
  userId: string
  s3Key: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  status: 'PENDING' | 'VALIDATED' | 'REJECTED'
  zone: 'FRONT' | 'BACK' | 'TAG'
  createdAt: string
}
