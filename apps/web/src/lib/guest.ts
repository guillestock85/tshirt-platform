const GUEST_ID_KEY = 'guestId'

/**
 * Get (or lazily create) a persistent guest session ID.
 * Stored in localStorage; safe for SSR (returns '' on server).
 * Falls back to a session-scoped UUID if localStorage is unavailable
 * (e.g. in strict-privacy browsers or sandboxed iframes).
 */
let _sessionFallbackId: string | null = null

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable — use a stable in-memory ID for this session
    if (!_sessionFallbackId) _sessionFallbackId = crypto.randomUUID()
    return _sessionFallbackId
  }
}

/**
 * Generate a fresh guest ID after login/register.
 * Prevents guest session re-use across different users.
 */
export function resetGuestId(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GUEST_ID_KEY, crypto.randomUUID())
}
