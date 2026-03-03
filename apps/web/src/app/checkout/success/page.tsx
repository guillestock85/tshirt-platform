'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, Mail, ArrowRight, Loader2 } from 'lucide-react'

// ─── Inner ────────────────────────────────────────────────────────────────────

function SuccessPageInner() {
  const params = useSearchParams()

  // MercadoPago returns collection_id, external_reference, etc.
  const orderId =
    params.get('external_reference') ??
    params.get('orderId') ??
    'tu pedido'

  const status = params.get('collection_status') ?? params.get('status') ?? 'approved'
  const isPending = status === 'pending' || status === 'in_process'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F7F5F0', fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="font-bold text-lg text-black" style={{ fontFamily: 'var(--font-sora)' }}>
            remera.design
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center">
          {/* Big checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
            style={{ backgroundColor: isPending ? '#FEF3C7' : '#D1FAE5' }}
          >
            <CheckCircle2
              className="w-10 h-10"
              style={{ color: isPending ? '#D97706' : '#059669' }}
            />
          </div>

          <h1
            className="font-bold text-3xl text-black mb-3"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            {isPending ? '¡Pago en proceso!' : '¡Listo! Pedido confirmado.'}
          </h1>

          <p className="text-gray-500 text-base leading-relaxed mb-8">
            {isPending
              ? 'Tu pago está siendo procesado. Te avisamos por email cuando se confirme.'
              : 'Recibimos tu pedido y pronto empezamos a producirlo. Te enviamos la confirmación por email.'}
          </p>

          {/* Order ID */}
          {orderId !== 'tu pedido' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 shadow-sm text-left">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Número de pedido
              </p>
              <p
                className="font-mono text-sm text-black font-semibold break-all"
              >
                {orderId}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Guardá este número para hacer seguimiento de tu pedido.
              </p>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm text-left space-y-4">
            <p className="font-bold text-sm text-black" style={{ fontFamily: 'var(--font-sora)' }}>
              ¿Qué pasa ahora?
            </p>
            <div className="space-y-3">
              {[
                {
                  icon: Mail,
                  title: 'Email de confirmación',
                  desc: 'Te mandamos los detalles de tu pedido.',
                },
                {
                  icon: Package,
                  title: 'Producción: 2–3 días hábiles',
                  desc: 'Imprimimos y preparamos tu remera con cuidado.',
                },
                {
                  icon: ArrowRight,
                  title: 'Envío: 3–5 días hábiles',
                  desc: 'Te avisamos cuando salga con número de seguimiento.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#F5F3FF' }}
                  >
                    <Icon className="w-4 h-4" style={{ color: '#7C3AED' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black">{title}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/crear"
            className="inline-flex items-center gap-2 bg-black text-white rounded-full px-7 py-3.5 font-semibold text-sm hover:bg-gray-800 transition-colors"
          >
            Diseñar otra remera
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F5F0' }}>
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <SuccessPageInner />
    </Suspense>
  )
}
