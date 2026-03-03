'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { AuthUser } from '@/lib/api'
import { X } from 'lucide-react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

type Tab = 'login' | 'register'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onLogin: (token: string, user: AuthUser) => void
  defaultTab?: Tab
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  onLogin,
  defaultTab = 'login',
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, defaultTab])

  // Escape to close
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
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) onClose()
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setError(null)
  }

  function normalizeError(data: { message?: string | string[] }): string {
    if (!data.message) return 'Ocurrió un error inesperado'
    if (Array.isArray(data.message)) return data.message.join('. ')
    return data.message
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(normalizeError(data)); return }
      onLogin(data.accessToken, data.user as AuthUser)
      onSuccess()
    } catch {
      setError('Error de conexión. Verificá tu internet.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Register ───────────────────────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(normalizeError(data)); return }
      onLogin(data.accessToken, data.user as AuthUser)
      onSuccess()
    } catch {
      setError('Error de conexión. Verificá tu internet.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Shared input className ──────────────────────────────────────────────────

  const inputCls =
    'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-shadow'

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Context message */}
        <p className="text-xs text-violet-600 font-semibold mb-1 uppercase tracking-wide">
          {activeTab === 'login' ? 'Para continuar' : 'Creá tu cuenta gratis'}
        </p>
        <h2 className="font-display font-bold text-xl text-black mb-5">
          {activeTab === 'login' ? 'Iniciá sesión' : 'Registrate'}
        </h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === t
                  ? 'bg-white text-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Login form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              autoFocus
              className={inputCls}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              required
              autoComplete="current-password"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-black text-white rounded-full py-3 font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {/* Register form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                name="firstName"
                type="text"
                placeholder="Nombre"
                required
                autoComplete="given-name"
                autoFocus
                className={inputCls}
              />
              <input
                name="lastName"
                type="text"
                placeholder="Apellido"
                required
                autoComplete="family-name"
                className={inputCls}
              />
            </div>
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              className={inputCls}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña (mín. 8 caracteres)"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-black text-white rounded-full py-3 font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
