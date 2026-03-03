'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Product } from '@/lib/api'
import { Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react'

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Elegí' },
    { n: 2, label: 'Diseñá' },
    { n: 3, label: 'Pedí' },
  ]
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s.n < current
                  ? 'bg-black text-white'
                  : s.n === current
                  ? 'text-white ring-2 ring-violet-600 ring-offset-2'
                  : 'bg-gray-100 text-gray-400'
              }`}
              style={
                s.n === current
                  ? { backgroundColor: '#7C3AED' }
                  : undefined
              }
            >
              {s.n < current ? <Check className="w-3.5 h-3.5" /> : s.n}
            </div>
            <span
              className={`text-sm font-semibold ${
                s.n === current ? 'text-black' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <div className="w-12 h-px bg-gray-200 mx-3" />}
        </div>
      ))}
    </div>
  )
}

// ─── T-shirt SVG ──────────────────────────────────────────────────────────────

function TshirtSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 130" className="w-32 h-auto drop-shadow-sm" fill="none">
      <path
        d="M44 10 L16 28 L2 42 L26 50 L26 118 L94 118 L94 50 L118 42 L104 28 L76 10 C73 20 66 24 60 24 C54 24 47 20 44 10Z"
        fill={color}
        stroke="#e5e7eb"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.colorHex, v])).values(),
  )
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)))
  const mainColor = uniqueColors[0]?.colorHex ?? '#ffffff'

  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
    >
      {/* Preview area */}
      <div
        className="h-52 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: '#F7F5F0' }}
      >
        <TshirtSVG color={mainColor} />

        {/* Hover overlay arrow */}
        <div
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
          style={{ backgroundColor: '#7C3AED' }}
        >
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3
          className="font-bold text-black text-sm leading-tight"
          style={{ fontFamily: 'var(--font-sora)' }}
        >
          {product.name}
        </h3>

        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="font-bold text-xl text-black">
            ${product.basePrice.toLocaleString('es-AR')}
          </span>
          <span className="text-xs text-gray-400 font-normal">/ unidad</span>
        </div>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 mt-3">
          {uniqueColors.slice(0, 8).map((v) => (
            <div
              key={v.colorHex}
              className="w-4 h-4 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
              style={{ backgroundColor: v.colorHex }}
              title={v.color}
            />
          ))}
          {uniqueColors.length > 8 && (
            <span className="text-[10px] text-gray-400">+{uniqueColors.length - 8}</span>
          )}
          <span className="ml-auto text-[10px] text-gray-400 font-medium">
            {uniqueSizes.length} talles
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrearPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then((ps) => setProducts(ps.filter((p) => p.isActive)))
      .catch(() => setError('No se pudieron cargar los productos'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F7F5F0', fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold text-lg text-black" style={{ fontFamily: 'var(--font-sora)' }}>
              remera.design
            </span>
          </Link>
          <StepBar current={1} />
          <div className="w-32" /> {/* spacer */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1
            className="font-bold text-3xl text-black"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            Elegí tu remera
          </h1>
          <p className="text-gray-400 mt-1.5">
            Seleccioná el modelo que querés personalizar
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-24">
            <p className="text-gray-400">No hay productos disponibles.</p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => router.push(`/design?productId=${p.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
