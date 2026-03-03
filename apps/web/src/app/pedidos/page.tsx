'use client'

import AppShell from '@/components/AppShell'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Order, OrderStatus } from '@/lib/api'
import { Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_MAP: Record<
  OrderStatus,
  { label: string; bg: string; color: string }
> = {
  DRAFT: { label: 'Borrador', bg: '#f3f4f6', color: '#6b7280' },
  CONFIRMED: { label: 'Confirmado', bg: '#fef3c7', color: '#d97706' },
  PAID: { label: 'Pagado', bg: '#d1fae5', color: '#059669' },
  IN_PRODUCTION: { label: 'En producción', bg: '#dbeafe', color: '#2563eb' },
  SHIPPED: { label: 'Enviado', bg: '#ede9fe', color: '#7c3aed' },
  DELIVERED: { label: 'Entregado', bg: '#d1fae5', color: '#059669' },
  CANCELLED: { label: 'Cancelado', bg: '#fee2e2', color: '#dc2626' },
}

export default function PedidosPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    api
      .get<Order[]>('/orders')
      .then(setOrders)
      .catch(() => setError('No se pudieron cargar los pedidos'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  return (
    <AppShell title="Pedidos">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 max-w-lg">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📦</span>
          </div>
          <p className="font-display font-bold text-black mb-1">
            Todavía no tenés pedidos
          </p>
          <p className="text-gray-400 text-sm mb-5">
            Creá tu primer diseño para empezar
          </p>
          <Link
            href="/design"
            className="inline-flex items-center gap-2 bg-black text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Nuevo diseño
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="max-w-4xl">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
              {['Orden #', 'Producto', 'Estado', 'Fecha', 'Total', ''].map(
                (h) => (
                  <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </span>
                ),
              )}
            </div>

            {/* Rows */}
            {orders.map((order) => {
              const s = STATUS_MAP[order.status]
              const item = order.items[0]
              const productName =
                item?.productVariant?.product?.name ?? '—'
              const variant =
                item
                  ? `${item.productVariant.color} / ${item.productVariant.size}`
                  : ''

              return (
                <div
                  key={order.id}
                  className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-mono font-semibold text-black">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black truncate">
                      {productName}
                    </p>
                    {variant && (
                      <p className="text-xs text-gray-400 truncate">{variant}</p>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block w-fit"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </span>
                  <span className="text-sm font-semibold text-black">
                    ${order.total.toLocaleString('es-AR')}
                  </span>
                  <Link href={`/pedidos/${order.id}`}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>
  )
}
