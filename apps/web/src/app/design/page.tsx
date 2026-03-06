'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAutosave } from '@/hooks/useAutosave'
import { api } from '@/lib/api'
import type { Product, ProductVariant, PresignResult, Upload as UploadRecord, Cart } from '@/lib/api'
import { CartDrawer } from '@/components/CartDrawer'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Upload,
  Type,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = 'FRONT' | 'BACK' | 'TAG'

interface Layer {
  id: string
  type: 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  content: string    // dataURL for images, text string for text layers
  fontSize?: number
  color?: string
  zone: Zone
}

type ZoneUploadIds = Partial<Record<Zone, string>>

// ─── Constants ────────────────────────────────────────────────────────────────

const PRINT_ZONE = { x: 88, y: 128, w: 124, h: 124 }

// ─── T-shirt SVG ─────────────────────────────────────────────────────────────

function TshirtSVG({ fillColor }: { fillColor: string }) {
  return (
    <svg
      viewBox="0 0 300 320"
      className="absolute inset-0 w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M110 28 L38 72 L4 108 L68 130 L68 292 L232 292 L232 130 L296 108 L262 72 L190 28 C184 48 170 60 150 60 C130 60 116 48 110 28Z"
        fill="#00000008"
        transform="translate(2, 3)"
      />
      <path
        d="M110 28 L38 72 L4 108 L68 130 L68 292 L232 292 L232 130 L296 108 L262 72 L190 28 C184 48 170 60 150 60 C130 60 116 48 110 28Z"
        fill={fillColor}
        stroke="#d1d5db"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M110 28 C116 48 130 60 150 60 C170 60 184 48 190 28"
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <line x1="68" y1="130" x2="38" y2="72" stroke="#e5e7eb" strokeWidth="0.5" />
      <line x1="232" y1="130" x2="262" y2="72" stroke="#e5e7eb" strokeWidth="0.5" />
    </svg>
  )
}

// ─── Autosave indicator ───────────────────────────────────────────────────────

function AutosaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          <span className="text-gray-400">Guardando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Guardado</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600">Sin guardar</span>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function DesignPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const productId = searchParams.get('productId')

  // Product data
  const [product, setProduct] = useState<Product | null>(null)
  const [productLoading, setProductLoading] = useState(true)

  // Variant selection
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Left panel tab
  const [leftTab, setLeftTab] = useState<'product' | 'design'>('product')

  // Zone
  const [activeZone, setActiveZone] = useState<Zone>('FRONT')

  // Canvas state
  const [layers, setLayers] = useState<Layer[]>([])
  const [history, setHistory] = useState<Layer[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Text tool state
  const [showTextTool, setShowTextTool] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const [textColor, setTextColor] = useState('#000000')

  // Drag state
  const drag = useRef<{
    active: boolean
    mode: 'move' | 'resize'
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
  } | null>(null)

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadIds, setUploadIds] = useState<ZoneUploadIds>({})
  const [uploading, setUploading] = useState(false)

  // Cart state
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartError, setCartError] = useState('')
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  // ─── Load product ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!productId) {
      setProductLoading(false)
      return
    }

    api
      .get<Product[]>('/products')
      .then((products) => {
        const found = products.find((p) => p.id === productId)
        if (found) {
          setProduct(found)
          const firstVariant = found.variants.find(
            (v) => v.stockStatus === 'AVAILABLE',
          )
          if (firstVariant) {
            setSelectedColor(firstVariant.colorHex)
            setSelectedSize(firstVariant.size)
          }
        }
      })
      .catch(() => {})
      .finally(() => setProductLoading(false))
  }, [productId])

  // Fetch initial cart item count for the badge
  useEffect(() => {
    api
      .get<Cart>('/cart')
      .then((c) => setCartCount(c.items.length))
      .catch(() => {})
  }, [])

  // ─── Derived values ─────────────────────────────────────────────────────

  const selectedVariant: ProductVariant | undefined = product?.variants.find(
    (v) => v.colorHex === selectedColor && v.size === selectedSize,
  )

  const unitPrice = selectedVariant
    ? (product?.basePrice ?? 0) + selectedVariant.additionalPrice
    : product?.basePrice ?? 0

  const uniqueColors = product
    ? Array.from(new Map(product.variants.map((v) => [v.colorHex, v])).values())
    : []

  const sizesForColor = product
    ? product.variants
        .filter((v) => v.colorHex === selectedColor)
        .map((v) => v.size)
    : []

  // ─── Autosave ───────────────────────────────────────────────────────────

  const handleRestore = useCallback(
    (draft: {
      variantId: string
      quantity: number
      zonesData: Record<string, unknown>
      uploadIds: Record<string, string>
    }) => {
      if (!product) return

      const variant = product.variants.find((v) => v.id === draft.variantId)
      if (variant) {
        setSelectedColor(variant.colorHex)
        setSelectedSize(variant.size)
      }
      setQuantity(draft.quantity)
      setUploadIds(draft.uploadIds as ZoneUploadIds)

      const restoredLayers: Layer[] = []
      for (const [zone, zoneLayers] of Object.entries(draft.zonesData)) {
        if (Array.isArray(zoneLayers)) {
          for (const l of zoneLayers as Layer[]) {
            // Image layers have their base64 content stripped on save —
            // skip them on restore (text layers restore fully).
            if (l.type === 'image' && !l.content) continue
            restoredLayers.push({ ...l, zone: zone as Zone })
          }
        }
      }
      if (restoredLayers.length > 0) {
        setLayers(restoredLayers)
        setHistory([[], restoredLayers])
        setHistoryIdx(1)
      }
    },
    [product],
  )

  const { status: autosaveStatus, flushSave } = useAutosave({
    productId,
    variantId: selectedVariant?.id ?? null,
    quantity,
    layers,
    uploadIds: uploadIds as Record<string, string>,
    isReady: !!selectedVariant && !productLoading,
    onRestore: handleRestore,
  })

  // ─── History helpers ────────────────────────────────────────────────────

  function pushHistory(newLayers: Layer[]) {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1)
      return [...trimmed, newLayers]
    })
    setHistoryIdx((i) => i + 1)
    setLayers(newLayers)
  }

  function undo() {
    if (historyIdx === 0) return
    const idx = historyIdx - 1
    setHistoryIdx(idx)
    setLayers(history[idx])
  }

  function redo() {
    if (historyIdx >= history.length - 1) return
    const idx = historyIdx + 1
    setHistoryIdx(idx)
    setLayers(history[idx])
  }

  // ─── Upload ─────────────────────────────────────────────────────────────

  async function doUpload(file: File, zone: Zone) {
    setUploading(true)
    try {
      const presign = await api.post<PresignResult>('/uploads/presign', {
        mimeType: file.type,
        sizeBytes: file.size,
        zone,
      })

      await fetch(presign.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      const upload = await api.post<UploadRecord>('/uploads/confirm', {
        key: presign.key,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        zone,
      })

      setUploadIds((prev) => ({ ...prev, [zone]: upload.id }))
    } catch {
      // Upload failed silently — canvas preview already shows the image
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const dataUrl = await new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(file)
    })

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type: 'image',
      x: 4,
      y: 4,
      width: PRINT_ZONE.w - 8,
      height: PRINT_ZONE.h - 8,
      content: dataUrl,
      zone: activeZone,
    }
    pushHistory([...layers, newLayer])
    setSelectedId(newLayer.id)

    const capturedZone = activeZone
    await doUpload(file, capturedZone)
  }

  // ─── Add text ───────────────────────────────────────────────────────────

  function handleAddText() {
    if (!textInput.trim()) return
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type: 'text',
      x: 10,
      y: PRINT_ZONE.h / 2 - fontSize / 2,
      width: PRINT_ZONE.w - 20,
      height: fontSize * 1.4,
      content: textInput,
      fontSize,
      color: textColor,
      zone: activeZone,
    }
    pushHistory([...layers, newLayer])
    setSelectedId(newLayer.id)
    setTextInput('')
    setShowTextTool(false)
  }

  // ─── Drag / resize ──────────────────────────────────────────────────────

  const handleLayerMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string, mode: 'move' | 'resize') => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedId(layerId)
      const layer = layers.find((l) => l.id === layerId)!
      drag.current = {
        active: true,
        mode,
        id: layerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: layer.x,
        origY: layer.y,
        origW: layer.width,
        origH: layer.height,
      }
    },
    [layers],
  )

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!drag.current?.active) return
      const d = drag.current
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY

      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== d.id) return l
          if (d.mode === 'move') {
            return {
              ...l,
              x: Math.max(0, Math.min(PRINT_ZONE.w - l.width, d.origX + dx)),
              y: Math.max(0, Math.min(PRINT_ZONE.h - l.height, d.origY + dy)),
            }
          } else {
            return {
              ...l,
              width: Math.max(20, d.origW + dx),
              height: Math.max(20, d.origH + dy),
            }
          }
        }),
      )
    }

    function onMouseUp() {
      if (drag.current?.active) {
        drag.current.active = false
        setLayers((current) => {
          setHistory((h) => {
            const trimmed = h.slice(0, historyIdx + 1)
            return [...trimmed, current]
          })
          setHistoryIdx((i) => i + 1)
          return current
        })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [historyIdx])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        pushHistory(layers.filter((l) => l.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, selectedId, historyIdx])

  // ─── Add to cart ────────────────────────────────────────────────────────

  async function handleAddToCart() {
    if (!selectedVariant) return
    setCartError('')

    const draftId = await flushSave()
    if (!draftId) {
      setCartError('No se pudo guardar el diseño. Intentá de nuevo.')
      return
    }

    // Cart supports guests via X-Guest-Id header (sent automatically by api.ts)
    setAddingToCart(true)
    try {
      await api.post('/cart/items', { draftDesignId: draftId })
      setCartCount((prev) => prev + 1)
      setCartDrawerOpen(true)
    } catch {
      setCartError('No se pudo agregar al carrito. Intentá de nuevo.')
    } finally {
      setAddingToCart(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const zoneLayers = layers.filter((l) => l.zone === activeZone)
  const canUndo = historyIdx > 0
  const canRedo = historyIdx < history.length - 1

  if (!productId || (!productLoading && !product)) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor: '#F7F5F0' }}
      >
        <p className="text-gray-500">No se especificó un producto.</p>
        <button
          onClick={() => router.push('/crear')}
          className="bg-black text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-gray-800"
        >
          Elegir producto
        </button>
      </div>
    )
  }

  if (productLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: '#F7F5F0' }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden select-none"
      style={{ backgroundColor: '#F7F5F0', fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/crear')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            title="Volver al catálogo"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Deshacer"
            >
              <Undo2 className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Rehacer"
            >
              <Redo2 className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          <span className="font-display font-bold text-sm text-black truncate max-w-40">
            {product?.name ?? 'Diseñar'}
          </span>
        </div>

        {/* Zone tabs (center) */}
        <div
          className="flex gap-1 rounded-full p-1"
          style={{ backgroundColor: '#f3f4f6' }}
        >
          {(['FRONT', 'BACK', 'TAG'] as Zone[]).map((z) => (
            <button
              key={z}
              onClick={() => setActiveZone(z)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeZone === z
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              {z === 'FRONT' ? 'Frente' : z === 'BACK' ? 'Espalda' : 'Etiqueta'}
            </button>
          ))}
        </div>

        {/* Right side: autosave + cart icon */}
        <div className="flex items-center gap-3">
          <AutosaveIndicator status={autosaveStatus} />
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Ver carrito"
          >
            <ShoppingCart className="w-4 h-4 text-gray-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left panel ─────────────────────────────────────────────── */}
        <aside className="flex-shrink-0 w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-gray-100">
            {(['product', 'design'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`flex-1 py-3 text-xs font-semibold transition-all border-b-2 ${
                  leftTab === tab
                    ? 'text-black border-black'
                    : 'text-gray-400 border-transparent hover:text-black'
                }`}
              >
                {tab === 'product' ? 'Producto' : 'Diseño'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* ── PRODUCTO tab ───────────────────────────────────────── */}
            {leftTab === 'product' && (
              <>
                {/* Color picker */}
                <div>
                  <p className="text-xs font-bold text-black mb-2">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map((v) => (
                      <button
                        key={v.colorHex}
                        onClick={() => {
                          setSelectedColor(v.colorHex)
                          const firstSize = product?.variants.find(
                            (pv) =>
                              pv.colorHex === v.colorHex && pv.stockStatus === 'AVAILABLE',
                          )?.size
                          if (firstSize) setSelectedSize(firstSize)
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          selectedColor === v.colorHex
                            ? 'border-black scale-110 shadow-md'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: v.colorHex }}
                        title={v.color}
                      />
                    ))}
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-gray-400 mt-1.5">{selectedVariant.color}</p>
                  )}
                </div>

                {/* Size picker */}
                <div>
                  <p className="text-xs font-bold text-black mb-2">Talle</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sizesForColor.map((size) => {
                      const variant = product?.variants.find(
                        (v) => v.colorHex === selectedColor && v.size === size,
                      )
                      const outOfStock = variant?.stockStatus === 'OUT_OF_STOCK'
                      return (
                        <button
                          key={size}
                          onClick={() => !outOfStock && setSelectedSize(size)}
                          disabled={outOfStock}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selectedSize === size
                              ? 'bg-black text-white border-black'
                              : outOfStock
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quantity stepper */}
                <div>
                  <p className="text-xs font-bold text-black mb-2">Cantidad</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <span className="text-sm font-bold text-black w-6 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                      className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-bold text-2xl text-black">
                      ${unitPrice.toLocaleString('es-AR')}
                    </span>
                    <span className="text-xs text-gray-400">/ unidad</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total: ${(unitPrice * quantity).toLocaleString('es-AR')}
                  </p>
                </div>
              </>
            )}

            {/* ── DISEÑO tab ─────────────────────────────────────────── */}
            {leftTab === 'design' && (
              <>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <Upload className="w-4 h-4 text-gray-400" />
                    )}
                    {uploading ? 'Subiendo imagen...' : 'Subir imagen'}
                  </button>

                  <button
                    onClick={() => setShowTextTool((v) => !v)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      showTextTool
                        ? 'bg-black text-white border-black'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    Agregar texto
                  </button>
                </div>

                {showTextTool && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Texto
                      </label>
                      <input
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Escribí tu texto..."
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Tamaño: {fontSize}px
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-black mb-1.5">
                        Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <span className="text-xs text-gray-400 font-mono">{textColor}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleAddText}
                      disabled={!textInput.trim()}
                      className="w-full bg-black text-white rounded-full py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40"
                    >
                      Agregar al diseño
                    </button>
                  </div>
                )}

                {layers.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-black mb-2">Capas</p>
                    <div className="space-y-1">
                      {[...layers].reverse().map((layer) => (
                        <div
                          key={layer.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                            selectedId === layer.id
                              ? 'bg-black text-white'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                          onClick={() => setSelectedId(layer.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {layer.type === 'image' ? (
                              <Upload className="w-3 h-3 flex-shrink-0" />
                            ) : (
                              <Type className="w-3 h-3 flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {layer.type === 'text' ? layer.content : 'Imagen'}
                            </span>
                            <span className="flex-shrink-0 opacity-50 text-[10px]">
                              {layer.zone}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              pushHistory(layers.filter((l) => l.id !== layer.id))
                              if (selectedId === layer.id) setSelectedId(null)
                            }}
                            className={`ml-2 p-0.5 rounded transition-colors ${
                              selectedId === layer.id
                                ? 'hover:bg-white/20'
                                : 'hover:bg-gray-200'
                            }`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ── Canvas ──────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center overflow-hidden relative">
          <div
            className="relative"
            style={{ width: 300, height: 320 }}
            onClick={() => setSelectedId(null)}
          >
            <TshirtSVG fillColor={selectedVariant?.colorHex ?? '#ffffff'} />

            <div
              className="absolute"
              style={{
                left: PRINT_ZONE.x,
                top: PRINT_ZONE.y,
                width: PRINT_ZONE.w,
                height: PRINT_ZONE.h,
                border: '2px dashed #c4b5fd',
                borderRadius: 4,
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {zoneLayers.length === 0 && (
                <button
                  onClick={() => {
                    setLeftTab('design')
                    fileInputRef.current?.click()
                  }}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-violet-50/50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <Upload className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                  </span>
                </button>
              )}

              {zoneLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="absolute cursor-move"
                  style={{
                    left: layer.x,
                    top: layer.y,
                    width: layer.width,
                    height: layer.height,
                    outline:
                      selectedId === layer.id
                        ? '2px solid #A78BFA'
                        : '1px dashed transparent',
                    outlineOffset: 1,
                  }}
                  onMouseDown={(e) => handleLayerMouseDown(e, layer.id, 'move')}
                >
                  {layer.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={layer.content}
                      alt=""
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center overflow-hidden pointer-events-none"
                      style={{
                        fontSize: layer.fontSize,
                        color: layer.color,
                        fontFamily: 'var(--font-sora), sans-serif',
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {layer.content}
                    </div>
                  )}

                  {selectedId === layer.id && (
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full cursor-se-resize"
                      style={{ backgroundColor: '#A78BFA', border: '1.5px solid white' }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleLayerMouseDown(e, layer.id, 'resize')
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-display font-bold text-lg text-black">
              ${(unitPrice * quantity).toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-gray-400 ml-1.5">
              ({quantity} × ${unitPrice.toLocaleString('es-AR')})
            </span>
          </div>
          {cartError && (
            <span className="text-xs text-red-500 max-w-xs truncate">{cartError}</span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={addingToCart || !selectedVariant}
          className="flex items-center gap-2 bg-black text-white rounded-full px-6 py-2.5 font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {addingToCart ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          Agregar al carrito
        </button>
      </footer>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Cart drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onCartChange={(count) => setCartCount(count)}
      />
    </div>
  )
}

export default function DesignPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-screen"
          style={{ backgroundColor: '#F7F5F0' }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <DesignPageInner />
    </Suspense>
  )
}
