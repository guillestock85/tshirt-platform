'use client'

import AppShell from '@/components/AppShell'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Product } from '@/lib/api'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function CatalogoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Product[]>('/products')
      .then(setProducts)
      .catch(() => setError('No se pudieron cargar los productos'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppShell title="Catálogo">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">No hay productos disponibles.</p>
          <p className="text-gray-300 text-xs mt-1">
            Ejecutá{' '}
            <code className="bg-gray-100 px-1 rounded">
              POST /products/seed/default
            </code>{' '}
            para cargar productos de prueba.
          </p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </AppShell>
  )
}

function ProductCard({ product }: { product: Product }) {
  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.colorHex, v])).values(),
  )
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)))
  const minPrice = product.basePrice

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      {/* Product image placeholder */}
      <div
        className="h-52 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: '#F7F5F0' }}
      >
        <TshirtIllustration
          color={uniqueColors[0]?.colorHex ?? '#ffffff'}
        />
      </div>

      <div className="p-5">
        <h3 className="font-display font-bold text-black text-base leading-tight">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price */}
        <p className="font-display font-bold text-xl text-black mt-3">
          ${minPrice.toLocaleString('es-AR')}
          <span className="font-sans font-normal text-xs text-gray-400 ml-1">
            por unidad
          </span>
        </p>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 mt-3">
          {uniqueColors.slice(0, 6).map((v) => (
            <div
              key={v.colorHex}
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: v.colorHex }}
              title={v.color}
            />
          ))}
          {uniqueColors.length > 6 && (
            <span className="text-xs text-gray-400">
              +{uniqueColors.length - 6}
            </span>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {uniqueSizes.length} talles
          </span>
        </div>

        <Link
          href={`/design?productId=${product.id}`}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white rounded-full py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Diseñar
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

function TshirtIllustration({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 120 130"
      className="w-32 h-32 drop-shadow-sm"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
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
