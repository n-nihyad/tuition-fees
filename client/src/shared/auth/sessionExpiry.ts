import { clearAccessToken, getAccessToken } from './tokenStorage'

export const SESSION_EXPIRED_EVENT = 'tuition:session-expired'
export const SESSION_EXPIRY_DELAY_MS = 1500

let timer: ReturnType<typeof setTimeout> | null = null
let pendingToken: string | null = null

export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(normalized))
    if (typeof claims !== 'object' || claims === null || !('exp' in claims)) return null
    const exp = claims.exp
    return typeof exp === 'number' && Number.isFinite(exp) && exp > 0 && Number.isFinite(exp * 1000)
      ? exp * 1000 : null
  } catch {
    return null
  }
}

// This only schedules UI sign-out; signature/authorization checks remain on the server.
export function watchTokenExpiry(token: string): () => void {
  const expiresAt = tokenExpiresAt(token)
  if (expiresAt === null) return () => {}
  let expiryTimer: ReturnType<typeof setTimeout> | null = null
  function check() {
    const remaining = expiresAt! - Date.now()
    if (remaining <= 0) scheduleSessionExpiry(token)
    else expiryTimer = setTimeout(check, Math.min(remaining, 2_147_483_647))
  }
  check()
  return () => { if (expiryTimer !== null) clearTimeout(expiryTimer) }
}

export function scheduleSessionExpiry(requestToken: string): void {
  // A late response from a previous login must not sign out the current user.
  if (getAccessToken() !== requestToken) return
  if (timer !== null && pendingToken === requestToken) return
  if (timer !== null) clearTimeout(timer)
  pendingToken = requestToken
  timer = setTimeout(() => {
    timer = null
    pendingToken = null
    if (getAccessToken() !== requestToken) return
    clearAccessToken()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }, SESSION_EXPIRY_DELAY_MS)
}
