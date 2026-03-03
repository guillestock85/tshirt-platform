import type { AuthUser } from './api'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

// ─── Cart / design state ──────────────────────────────────────────────────────

export interface CartState {
  productVariantId: string
  productSlug: string
  productName: string
  variantColor: string
  variantSize: string
  colorHex: string
  unitPrice: number
  quantity: number
  uploads: {
    FRONT?: string  // uploadId
    BACK?: string
    TAG?: string
  }
  previewDataUrl?: string  // base64 for display only
}

export function getCart(): CartState | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('cart')
  if (!raw) return null
  try {
    return JSON.parse(raw) as CartState
  } catch {
    return null
  }
}

export function setCart(cart: CartState): void {
  localStorage.setItem('cart', JSON.stringify(cart))
}

export function clearCart(): void {
  localStorage.removeItem('cart')
}
