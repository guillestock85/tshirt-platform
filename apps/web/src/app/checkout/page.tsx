'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Cart, PaymentPreference } from '@/lib/api'
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShippingForm {
  email: string
  street: string
  city: string
  province: string
  postalCode: string
  country: string
}

// ─── Mini T-shirt icon ────────────────────────────────────────────────────────

function MiniShirt({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 45" className="w-9 h-9" fill="none">
      <path
        d="M14 4 L5 11 L1 17 L10 20 L10 42 L30 42 L30 20 L39 17 L35 11 L26 4 C24 9 22 10 20 10 C18 10 16 9 14 4Z"
        fill={color}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    </svg>
  )
}

// ─── Field component ─────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-black mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()

  const [cart, setCart] = useState<Cart | null>(null)
  const [cartLoading, setCartLoading] = useState(true)
  const [form, setForm] = useState<ShippingForm>({
    email: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'AR',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Cart>('/cart')
      .then(setCart)
      .catch(() => setError('No se pudo cargar el carrito'))
      .finally(() => setCartLoading(false))
  }, [])

  function updateField(field: keyof ShippingForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (!cart || cart.items.length === 0) return

    setError('')
    setLoading(true)

    try {
      // 1. Create order from cart (auto-confirmed, supports guest)
      const order = await api.post<{ id: string }>('/orders/from-cart', {
        cartId: cart.id,
        guestEmail: form.email,
        shippingAddress: {
          street: form.street,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          country: form.country,
        },
      })

      // 2. Create MercadoPago preference
      const pref = await api.post<PaymentPreference>(`/payments/preference/${order.id}`)

      // 3. Redirect to MercadoPago
      window.location.href = pref.sandboxInitPoint ?? pref.initPoint
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al procesar el pago. Intentá de nuevo.'
      setError(msg)
      setLoading(false)
    }
  }

  const hasItems = (cart?.items.length ?? 0) > 0
  const hasPriceChanges = cart?.items.some((item) => item.priceChanged) ?? false

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F7F5F0', fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-black" style={{ fontFamily: 'var(--font-sora)' }}>
            remera.design
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Lock className="w-3.5 h-3.5" />
            Pago seguro
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Loading */}
        {cartLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty cart */}
        {!cartLoading && !hasItems && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
              <ShoppingBag className="w-7 h-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black mb-1">Tu carrito está vacío</p>
              <p className="text-sm text-gray-400">Agregá un diseño antes de comprar</p>
            </div>
            <Link
              href="/crear"
              className="inline-flex items-center gap-2 bg-black text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Diseñar algo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Checkout form */}
        {!cartLoading && hasItems && (
          <form onSubmit={handleCheckout}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
              <Link href="/crear" className="flex items-center gap-1 hover:text-black transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Seguir comprando
              </Link>
              <span>/</span>
              <span className="text-black font-medium">Checkout</span>
            </div>

            {/* Price change warning */}
            {hasPriceChanges && (
              <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl px-4 py-3.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  El precio de uno o más productos cambió desde que los agregaste al carrito.
                  El total refleja los precios actualizados.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* ── Left: form ─────────────────────────────────────── */}
              <div className="lg:col-span-3 space-y-4">

                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="font-bold text-base text-black mb-5" style={{ fontFamily: 'var(--font-sora)' }}>
                    Contacto
                  </h2>
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={updateField('email')}
                      placeholder="tu@email.com"
                      required
                      className={inputCls}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Te enviamos la confirmación y el seguimiento de tu pedido.
                    </p>
                  </Field>
                </div>

                {/* Shipping */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="font-bold text-base text-black mb-5" style={{ fontFamily: 'var(--font-sora)' }}>
                    Dirección de envío
                  </h2>
                  <div className="space-y-4">
                    <Field label="Calle y número">
                      <input
                        value={form.street}
                        onChange={updateField('street')}
                        placeholder="Av. Corrientes 1234"
                        required
                        className={inputCls}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Ciudad">
                        <input
                          value={form.city}
                          onChange={updateField('city')}
                          placeholder="Buenos Aires"
                          required
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Provincia">
                        <input
                          value={form.province}
                          onChange={updateField('province')}
                          placeholder="CABA"
                          required
                          className={inputCls}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Código postal">
                        <input
                          value={form.postalCode}
                          onChange={updateField('postalCode')}
                          placeholder="1043"
                          required
                          className={inputCls}
                        />
                      </Field>
                      <Field label="País">
                        <select
                          value={form.country}
                          onChange={updateField('country')}
                          className={inputCls}
                        >
                          <option value="AR">Argentina</option>
                          <option value="UY">Uruguay</option>
                          <option value="CL">Chile</option>
                          <option value="BR">Brasil</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                    {error}
                  </div>
                )}
              </div>

              {/* ── Right: summary + pay ──────────────────────────── */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <h2 className="font-bold text-base text-black mb-5" style={{ fontFamily: 'var(--font-sora)' }}>
                    Tu pedido
                  </h2>

                  <div className="space-y-4">
                    {cart!.items.map((item) => (
                      <div key={item.id} className="flex gap-3 items-center">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#F7F5F0' }}
                        >
                          <MiniShirt color={item.variant.colorHex} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-black truncate">
                            {item.variant.product.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.variant.color} · {item.variant.size} · ×{item.quantity}
                          </p>
                          {item.priceChanged && (
                            <p className="text-xs text-amber-600 font-medium">Precio actualizado</p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-black">
                            ${(item.currentUnitPrice * item.quantity).toLocaleString('es-AR')}
                          </p>
                          {item.priceChanged && (
                            <p className="text-xs text-gray-400 line-through">
                              ${(item.unitPriceSnapshot * item.quantity).toLocaleString('es-AR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-gray-100 pt-4 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium text-black">
                          ${cart!.subtotal.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Envío</span>
                        <span className="text-emerald-600 font-semibold">Gratis</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-3">
                        <span>Total</span>
                        <span>${cart!.subtotal.toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pay button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 text-white rounded-2xl py-4 font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  style={{ backgroundColor: '#009EE3' }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      {/* MercadoPago logo-style text */}
                      <span className="font-bold">Pagar con MercadoPago</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pago procesado de forma segura
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
