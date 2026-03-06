'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  LayoutGrid,
  Palette,
  User,
  ChevronRight,
  Shirt,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/catalogo', label: 'Catálogo', icon: LayoutGrid },
  { href: '/crear', label: 'Crear', icon: Palette },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside
      className="flex flex-col border-r border-gray-200 flex-shrink-0"
      style={{ width: 230, minHeight: '100vh', backgroundColor: '#F7F5F0' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-base text-black tracking-tight">
            remera.design
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                isActive
                  ? 'bg-white shadow-sm text-black font-semibold'
                  : 'text-gray-500 hover:bg-white hover:text-black hover:shadow-sm'
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'}`}
              />
              <span className="text-sm flex-1">{label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-5 pt-3 border-t border-gray-200 flex-shrink-0">
        {user ? (
          /* Logged-in user (e.g. admin) */
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition-colors group">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.role === 'ADMIN' ? 'Admin' : 'Cliente'}
              </p>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-black flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Guest — no login link */
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-sm text-gray-400">Invitado</span>
          </div>
        )}
      </div>
    </aside>
  )
}
