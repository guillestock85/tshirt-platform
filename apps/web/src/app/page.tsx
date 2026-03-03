import Link from 'next/link'
import { ArrowRight, Palette, Truck, CheckCircle, Star, ShieldCheck, Zap, Package } from 'lucide-react'

// ─── T-Shirt SVG ─────────────────────────────────────────────────────────────

function TshirtSVG({ color = '#ffffff', className = '' }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M110 28 L38 72 L4 108 L68 130 L68 292 L232 292 L232 130 L296 108 L262 72 L190 28 C184 48 170 60 150 60 C130 60 116 48 110 28Z"
        fill="#00000006"
        transform="translate(2, 3)"
      />
      <path
        d="M110 28 L38 72 L4 108 L68 130 L68 292 L232 292 L232 130 L296 108 L262 72 L190 28 C184 48 170 60 150 60 C130 60 116 48 110 28Z"
        fill={color}
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
    </svg>
  )
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    icon: Palette,
    title: 'Elegí tu remera',
    desc: 'Seleccioná el modelo, color y talle. Lo que ves es lo que recibís.',
  },
  {
    num: '02',
    icon: Package,
    title: 'Subí tu diseño',
    desc: 'Cargá tu imagen o escribí un texto. Visualizalo en tiempo real sobre la prenda.',
  },
  {
    num: '03',
    icon: Truck,
    title: 'Recibilo en casa',
    desc: 'Pagá con MercadoPago o tarjeta y te lo enviamos en 5–7 días hábiles.',
  },
]

// ─── Features ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Star,
    label: 'Sin mínimos',
    sub: 'Pedí desde una sola unidad, sin compromisos.',
  },
  {
    icon: ShieldCheck,
    label: 'Pago seguro',
    sub: 'MercadoPago y tarjetas de crédito / débito.',
  },
  {
    icon: Zap,
    label: 'Entrega rápida',
    sub: 'Producción y envío en 5–7 días hábiles a todo el país.',
  },
  {
    icon: CheckCircle,
    label: 'Sin cuenta',
    sub: 'Comprá sin registrarte. Seguí tu pedido por email.',
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span
            className="font-bold text-xl text-black tracking-tight"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            remera.design
          </span>
          <Link
            href="/crear"
            className="inline-flex items-center gap-2 bg-black text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Diseñar ahora
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-28">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Copy */}
          <div className="flex-1 max-w-xl">
            <span
              className="inline-block mb-5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border"
              style={{
                backgroundColor: '#F5F3FF',
                color: '#7C3AED',
                borderColor: '#DDD6FE',
              }}
            >
              ✨ Sin cuenta · Sin mínimos · Envío a todo el país
            </span>

            <h1
              className="font-bold text-5xl lg:text-6xl leading-[1.1] text-black mb-6"
              style={{ fontFamily: 'var(--font-sora)' }}
            >
              Tu remera,<br />
              <span style={{ color: '#7C3AED' }}>como la imaginás.</span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-9">
              Subí tu logo o arte, elegí el color y talle, y recibilo en tu puerta.
              <br />Tan simple como eso.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/crear"
                className="inline-flex items-center gap-2 text-white rounded-full px-8 py-4 text-base font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: '#7C3AED' }}
              >
                Empezar a diseñar
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-sm text-gray-400 font-medium">Sin registrarse</span>
            </div>

            {/* Social proof row */}
            <div className="flex items-center gap-2 mt-10">
              <div className="flex -space-x-2">
                {['#7C3AED', '#10b981', '#f59e0b', '#3b82f6'].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-black">+1.200</span> personas ya diseñaron su remera
              </p>
            </div>
          </div>

          {/* T-shirt showcase */}
          <div className="flex-shrink-0 relative select-none">
            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: '#7C3AED',
                opacity: 0.08,
                filter: 'blur(80px)',
                transform: 'scale(1.3)',
              }}
            />

            {/* Three shirts stacked */}
            <div className="relative flex items-end gap-3">
              <div
                className="opacity-40 drop-shadow-lg"
                style={{ transform: 'rotate(-10deg) translateY(28px)' }}
              >
                <TshirtSVG color="#1f2937" className="w-28 h-auto" />
              </div>

              {/* Center (main) */}
              <div className="relative z-10 drop-shadow-2xl">
                <TshirtSVG color="#ffffff" className="w-56 h-auto" />
                {/* Print zone dashed outline */}
                <div
                  className="absolute"
                  style={{
                    left: '29%',
                    top: '42%',
                    width: '42%',
                    height: '37%',
                    border: '2px dashed #7C3AED',
                    borderRadius: 4,
                    opacity: 0.5,
                  }}
                />
                {/* "Tu diseño aquí" label */}
                <div
                  className="absolute text-[9px] font-bold tracking-widest uppercase"
                  style={{
                    left: '29%',
                    top: '43%',
                    color: '#7C3AED',
                    opacity: 0.7,
                    transform: 'translateY(4px)',
                    paddingLeft: 4,
                  }}
                >
                  Tu diseño
                </div>
              </div>

              <div
                className="opacity-40 drop-shadow-lg"
                style={{ transform: 'rotate(10deg) translateY(28px)' }}
              >
                <TshirtSVG color="#6b7280" className="w-28 h-auto" />
              </div>
            </div>

            {/* Color pills below shirts */}
            <div className="flex justify-center gap-2 mt-6">
              {['#1f2937', '#ffffff', '#dc2626', '#2563eb', '#7C3AED', '#059669'].map((c) => (
                <div
                  key={c}
                  className="w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#F7F5F0' }} className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase mb-3"
              style={{ color: '#7C3AED' }}
            >
              Así de simple
            </p>
            <h2
              className="font-bold text-4xl lg:text-5xl text-black"
              style={{ fontFamily: 'var(--font-sora)' }}
            >
              3 pasos para tener<br />tu remera lista
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <div
                key={num}
                className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Big number background */}
                <span
                  className="absolute top-4 right-6 font-bold text-7xl select-none pointer-events-none"
                  style={{
                    fontFamily: 'var(--font-sora)',
                    color: i === 1 ? '#7C3AED' : '#f3f4f6',
                    opacity: i === 1 ? 0.15 : 1,
                  }}
                >
                  {num}
                </span>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: i === 1 ? '#7C3AED' : '#F5F3FF' }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: i === 1 ? '#ffffff' : '#7C3AED' }}
                  />
                </div>

                <h3
                  className="font-bold text-xl text-black mb-2"
                  style={{ fontFamily: 'var(--font-sora)' }}
                >
                  {title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA after steps */}
          <div className="text-center mt-12">
            <Link
              href="/crear"
              className="inline-flex items-center gap-2 bg-black text-white rounded-full px-7 py-3.5 font-semibold hover:bg-gray-800 transition-colors"
            >
              Empezar ahora — es gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features / Trust ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="font-bold text-4xl text-black"
              style={{ fontFamily: 'var(--font-sora)' }}
            >
              ¿Por qué remera.design?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-2xl p-6 border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#F5F3FF' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#7C3AED' }} />
                </div>
                <p className="font-bold text-black text-sm mb-1">{label}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample designs strip ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: '#F7F5F0' }} className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-8">Algunos de los colores disponibles</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { color: '#ffffff', name: 'Blanco' },
              { color: '#1f2937', name: 'Negro' },
              { color: '#6b7280', name: 'Gris' },
              { color: '#dc2626', name: 'Rojo' },
              { color: '#2563eb', name: 'Azul' },
              { color: '#7C3AED', name: 'Violeta' },
              { color: '#059669', name: 'Verde' },
              { color: '#d97706', name: 'Naranja' },
            ].map(({ color, name }) => (
              <div key={color} className="flex flex-col items-center gap-2">
                <TshirtSVG color={color} className="w-20 h-auto drop-shadow-sm" />
                <span className="text-xs text-gray-400">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div
          className="max-w-3xl mx-auto text-center rounded-3xl p-16 relative overflow-hidden text-white"
          style={{ backgroundColor: '#1a1a2e' }}
        >
          {/* Decorative glows */}
          <div
            className="absolute top-0 left-1/4 w-72 h-72 rounded-full"
            style={{
              backgroundColor: '#7C3AED',
              opacity: 0.15,
              filter: 'blur(80px)',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full"
            style={{
              backgroundColor: '#A78BFA',
              opacity: 0.1,
              filter: 'blur(60px)',
              transform: 'translateY(40%)',
            }}
          />

          <p
            className="relative z-10 text-xs font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: '#A78BFA' }}
          >
            Empezá hoy
          </p>
          <h2
            className="relative z-10 font-bold text-4xl lg:text-5xl text-white mb-5 leading-tight"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            ¿Qué vas a crear hoy?
          </h2>
          <p className="relative z-10 text-gray-400 text-lg mb-10">
            Sin cuenta. Sin mínimos. Solo tu idea y nuestra calidad.
          </p>
          <Link
            href="/crear"
            className="relative z-10 inline-flex items-center gap-2 bg-white text-black rounded-full px-9 py-4 text-base font-bold hover:bg-gray-100 transition-all shadow-2xl hover:scale-[1.03] active:scale-[0.97]"
          >
            Crear mi remera
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="relative z-10 text-gray-600 text-xs mt-5">
            Sin tarjeta requerida para empezar
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span
            className="font-bold text-base text-black"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            remera.design
          </span>
          <div className="flex items-center gap-6">
            <Link href="/crear" className="hover:text-black transition-colors">
              Crear
            </Link>
            <Link href="/catalogo" className="hover:text-black transition-colors">
              Catálogo
            </Link>
          </div>
          <span>© 2026 · Hecho en Argentina 🇦🇷</span>
        </div>
      </footer>
    </div>
  )
}
