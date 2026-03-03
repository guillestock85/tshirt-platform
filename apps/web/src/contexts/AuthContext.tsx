'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { getToken, getUser, setToken, setUser, clearAuth } from '@/lib/auth'
import type { AuthUser } from '@/lib/api'
import { api } from '@/lib/api'
import { getGuestId, resetGuestId } from '@/lib/guest'
import { AuthModal } from '@/components/AuthModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => Promise<void>
  logout: () => void
  openAuthModal: (onSuccess?: () => void) => void
  closeAuthModal: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // useRef avoids re-rendering every consumer when callback changes
  const onSuccessRef = useRef<(() => void) | undefined>(undefined)

  // Initialize from localStorage on mount (client-side only)
  useEffect(() => {
    const token = getToken()
    const storedUser = getUser()
    if (token && storedUser) {
      setUserState(storedUser)
    }
  }, [])

  // Catch-all: any 401 from api.ts dispatches this event
  useEffect(() => {
    function handleAuthRequired() {
      setIsModalOpen(true)
    }
    window.addEventListener('auth:required', handleAuthRequired)
    return () => window.removeEventListener('auth:required', handleAuthRequired)
  }, [])

  const login = useCallback(async (token: string, authUser: AuthUser) => {
    setToken(token)
    setUser(authUser)
    setUserState(authUser)

    // Merge guest session into authenticated user's cart
    const guestId = getGuestId()
    if (guestId) {
      try {
        await api.post('/cart/merge', { guestId })
      } catch {
        // Merge failure is non-fatal — user still gets logged in
      }
      resetGuestId()
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUserState(null)
  }, [])

  const openAuthModal = useCallback((onSuccess?: () => void) => {
    onSuccessRef.current = onSuccess
    setIsModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false)
    onSuccessRef.current = undefined
  }, [])

  function handleModalSuccess() {
    setIsModalOpen(false)
    const cb = onSuccessRef.current
    onSuccessRef.current = undefined
    cb?.()
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    openAuthModal,
    closeAuthModal,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isModalOpen}
        onClose={closeAuthModal}
        onSuccess={handleModalSuccess}
        onLogin={login}
      />
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
