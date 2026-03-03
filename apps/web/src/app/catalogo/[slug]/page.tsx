'use client'

import AppShell from '@/components/AppShell'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Product, ProductVariant } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { setCart } from '@/lib/auth'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    api
      .get<Product>(`/products/${slug}`)
      .then((p) => {
        setProduct(p)
        if (p.variants[0]) {
          setSelectedColor(p.variants[0].color)
          setSelectedSize(p.variants[0].size)
        }
      })
      .catch(() => router.push('/catalogo'))
      .finally(() => setLoading(false))
  }, [slug, router])

  if (loading)
    return (
      <AppShell title="Producto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </AppShell>
    )

  if (!product) return null

  const uniqueColors = Array.from(
    new Map(product.variants.map((v) => [v.color, v])).values(),
  )
  const sizesForColor = product.variants
    .filter((v) => v.color === selectedColor)
    .map((v) => v.size)

  const selectedVariant: ProductVariant | undefined = product.variants.find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  )
  const unitPrice =
    product.basePrice + (selectedVariant?.additionalPrice ?? 0)

  function handleStartDesign() {
    if (!selectedVariant) return
    setCart({
      productVariantId: selectedVariant.id,
      productSlug: product!.slug,
      productName: product!.name,
      variantColor: selectedVariant.color,
      variantSize: selectedVariant.size,
      colorHex: selectedVariant.colorHex,
      unitPrice,
      quantity,
      uploads: {},
    })
    router.push('/design')
  }

  return (
    <AppShell title="">
      <div className="max-w-4xl">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-black mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al catálogo
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: product image */}
          <div
            className="rounded-2xl flex items-center justify-center h-96 border border-gray-100"
            style={{ backgroundColor: '#F7F5F0' }}
          >
            <svg
              viewBox="0 0 160 175"
              className="w-56 h-56 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M58 13 L22 37 L3 57 L34 67 L34 158 L126 158 L126 67 L157 57 L138 37 L102 13 C97 27 88 32 80 32 C72 32 63 27 58 13Z"
                fill={
                  product.variants.find((v) => v.color === selectedColor)
                    ?.colorHex ?? '#ffffff'
                }
                stroke="#e5e7eb"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Right: info */}
          <div className="space-y-5">
            <div>
              <h1 className="font-display font-bold text-2xl text-black leading-tight">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>

            {/* Details table */}
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {[
                ['Material', '100% algodón ring-spun'],
                ['Técnica', 'DTG / Serigrafía'],
                ['Colores disponibles', `${uniqueColors.length} colores`],
                ['Talles', sizesForColor.join(', ')],
              ].map(([k, v]) => (
                <div key={k} className="flex px-4 py-3 text-sm">
                  <span className="text-gray-400 w-36 flex-shrink-0">{k}</span>
                  <span className="text-black font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Color selector */}
            <div>
              <p className="text-sm font-semibold text-black mb-2">
                Color:{' '}
                <span className="font-normal text-gray-500">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((v) => (
                  <button
                    key={v.color}
                    onClick={() => {
                      setSelectedColor(v.color)
                      const firstSize = product.variants.find(
                        (pv) => pv.color === v.color,
                      )?.size
                      if (firstSize) setSelectedSize(firstSize)
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === v.color
                        ? 'border-black scale-110 shadow-sm'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: v.colorHex }}
                    title={v.color}
                  />
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div>
              <p className="text-sm font-semibold text-black mb-2">Talle</p>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      selectedSize === size
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-200 hover:border-black'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-black mb-2">Cantidad</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-sm font-bold hover:border-black transition-colors"
                >
                  −
                </button>
                <span className="text-base font-semibold w-6 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-sm font-bold hover:border-black transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price + CTA */}
            <div className="pt-2">
              <p className="font-display font-bold text-3xl text-black mb-4">
                ${(unitPrice * quantity).toLocaleString('es-AR')}
                <span className="text-sm font-sans font-normal text-gray-400 ml-2">
                  total
                </span>
              </p>
              <button
                onClick={handleStartDesign}
                disabled={!selectedVariant}
                className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-full py-3.5 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Empezar diseño
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
