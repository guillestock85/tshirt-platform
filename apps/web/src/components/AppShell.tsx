'use client'

import Sidebar from './Sidebar'
import { Bell, ShoppingCart } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title = '' }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F5F0' }}>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Beta banner */}
        <div
          className="flex-shrink-0 text-white text-center text-sm py-2 px-4 font-medium"
          style={{ backgroundColor: '#A78BFA' }}
        >
          Estamos en Beta 🚀 Tu feedback es clave
        </div>

        {/* Top header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200"
          style={{ backgroundColor: '#F7F5F0' }}
        >
          <h1 className="font-display font-bold text-xl text-black">{title}</h1>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:shadow-sm transition-shadow">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:shadow-sm transition-shadow">
              <ShoppingCart className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
