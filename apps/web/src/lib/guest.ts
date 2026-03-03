const GUEST_ID_KEY = 'guestId'

/**
 * Get (or lazily create) a persistent guest session ID.
 * Stored in localStorage; safe for SSR (returns '' on server).
 */
export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}

/**
 * Generate a fresh guest ID after login/register.
 * Prevents guest session re-use across different users.
 */
export function resetGuestId(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(GUEST_ID_KEY, crypto.randomUUID())
}
