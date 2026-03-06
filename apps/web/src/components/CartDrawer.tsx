'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, Palette } from 'lucide-react'
import { api } from '@/lib/api'
import type { Cart, CartItem } from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Called after any cart mutation so parent can refresh the item count */
  onCartChange?: (newCount: number) => void
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(cents)
}

export function CartDrawer({ isOpen, onClose, onCartChange }: Props) {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchCart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<Cart>('/cart')
      setCart(data)
      onCartChange?.(data.items.length)
    } catch {
      setError('No se pudo cargar el carrito.')
    } finally {
      setLoading(false)
    }
  }, [onCartChange])

  // Fetch every time the drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchCart()
    }
  }, [isOpen, fetchCart])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function updateQuantity(item: CartItem, delta: number) {
    const newQty = item.quantity + delta
    if (newQty < 1) return
    setUpdatingId(item.id)
    try {
      await api.patch(`/cart/items/${item.id}`, { quantity: newQty })
      await fetchCart()
    } catch {
      // silently fail — cart will still show old state
    } finally {
      setUpdatingId(null)
    }
  }

  async function removeItem(item: CartItem) {
    setUpdatingId(item.id)
    try {
      await api.delete(`/cart/items/${item.id}`)
      await fetchCart()
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null)
    }
  }

  function goToCheckout() {
    onClose()
    router.push('/checkout')
  }

  if (!isOpen) return null

  const items = cart?.items ?? []
  const subtotal = cart?.subtotal ?? 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gray-700" />
            <h2 className="font-display font-bold text-lg text-black">Tu carrito</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar carrito"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-xl border border-gray-100 p-4">
                  <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/3 rounded bg-gray-200" />
                  <div className="mt-3 h-8 w-full rounded bg-gray-100" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ShoppingCart className="h-7 w-7 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Tu carrito está vacío</p>
                <p className="mt-1 text-sm text-gray-500">Elegí un producto y empezá a diseñar</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                <Palette className="h-4 w-4" />
                Seguir diseñando
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="space-y-4">
              {items.map((item) => {
                const lineTotal = item.unitPriceSnapshot * item.quantity
                const isUpdating = updatingId === item.id

                return (
                  <li
                    key={item.id}
                    className={`rounded-xl border border-gray-100 p-4 transition-opacity ${
                      isUpdating ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    {/* Product info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-black leading-tight truncate">
                          {item.variant.product.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Color swatch */}
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: item.variant.colorHex }}
                            title={item.variant.color}
                          />
                          <span className="text-xs text-gray-500">{item.variant.color}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                            {item.variant.size}
                          </span>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(item)}
                        disabled={isUpdating}
                        className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        aria-label="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Price changed warning */}
                    {item.priceChanged && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        ⚠ El precio de este producto cambió
                      </p>
                    )}

                    {/* Quantity + price row */}
                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity controls */}
                      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item, -1)}
                          disabled={isUpdating || item.quantity <= 1}
                          className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200 text-sm font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item, 1)}
                          disabled={isUpdating}
                          className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Line total */}
                      <p className="font-bold text-sm text-black">{formatPrice(lineTotal)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer — only shown when cart has items */}
        {!loading && !error && items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold text-black text-base">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-gray-400">El costo de envío se calcula al finalizar la compra.</p>

            {/* Actions */}
            <button
              onClick={goToCheckout}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-black py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Ir al checkout
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 rounded-full border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Palette className="h-4 w-4" />
              Seguir diseñando
            </button>
          </div>
        )}
      </div>
    </>
  )
}
