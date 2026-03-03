'use client'

import AppShell from '@/components/AppShell'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setUser as saveUser, getToken } from '@/lib/auth'
import { User, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

export default function CuentaPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  function updatePwd(field: keyof typeof pwdForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setPwdForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('Las contraseñas no coinciden')
      return
    }
    setPwdError('')
    setPwdLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPwdError(data.message ?? 'Error al cambiar la contraseña')
        return
      }
      setPwdSuccess(true)
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch {
      setPwdError('Error de conexión')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <AppShell title="Mi cuenta">
      <div className="max-w-2xl space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="font-display font-bold text-base text-black">
              Información de perfil
            </h2>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-display font-bold text-xl flex-shrink-0">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div>
                  <p className="font-display font-bold text-lg text-black">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
                    style={{
                      backgroundColor:
                        user.role === 'ADMIN' ? '#ede9fe' : '#f3f4f6',
                      color: user.role === 'ADMIN' ? '#7c3aed' : '#6b7280',
                    }}
                  >
                    {user.role === 'ADMIN' ? 'Administrador' : 'Cliente'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { label: 'Nombre', value: user.firstName },
                  { label: 'Apellido', value: user.lastName },
                  { label: 'Email', value: user.email },
                  { label: 'Rol', value: user.role === 'ADMIN' ? 'Administrador' : 'Cliente' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-gray-50 rounded-xl px-4 py-3"
                  >
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No hay información disponible.{' '}
              <a href="/login" className="text-black underline">
                Iniciá sesión
              </a>
            </p>
          )}
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <Lock className="w-4 h-4 text-gray-400" />
            <h2 className="font-display font-bold text-base text-black">
              Cambiar contraseña
            </h2>
          </div>

          <form onSubmit={handleChangePwd} className="space-y-4">
            {[
              {
                field: 'currentPassword' as const,
                label: 'Contraseña actual',
                placeholder: '••••••••',
              },
              {
                field: 'newPassword' as const,
                label: 'Nueva contraseña',
                placeholder: 'Mínimo 8 caracteres',
              },
              {
                field: 'confirmPassword' as const,
                label: 'Confirmar contraseña',
                placeholder: '••••••••',
              },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-semibold text-black mb-1.5">
                  {label}
                </label>
                <input
                  type="password"
                  value={pwdForm[field]}
                  onChange={updatePwd(field)}
                  placeholder={placeholder}
                  required
                  minLength={field !== 'currentPassword' ? 8 : 1}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                />
              </div>
            ))}

            {pwdError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-3 py-2.5">
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div className="bg-green-50 border border-green-100 text-green-600 text-xs rounded-xl px-3 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Contraseña actualizada correctamente
              </div>
            )}

            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-black text-white rounded-full px-6 py-2.5 font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {pwdLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Actualizar contraseña
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
