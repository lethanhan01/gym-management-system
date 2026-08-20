const DEFAULT_MEMBER_REDIRECT = '/member'
const REDIRECT_PARSE_BASE = 'https://rogym.local'

export function getSafeMemberRedirect(rawRedirect: string | null): string {
  if (!rawRedirect) return DEFAULT_MEMBER_REDIRECT

  let target = rawRedirect.trim()
  try {
    target = decodeURIComponent(target)
  } catch {
    // Ignore URI error and keep target string
  }

  if (
    !target.startsWith('/') ||
    target.includes('://') ||
    target.startsWith('//') ||
    target.includes('\\') ||
    target.includes('\0')
  ) {
    return DEFAULT_MEMBER_REDIRECT
  }

  let url: URL
  try {
    url = new URL(target, REDIRECT_PARSE_BASE)
  } catch {
    return DEFAULT_MEMBER_REDIRECT
  }

  if (url.origin !== REDIRECT_PARSE_BASE) return DEFAULT_MEMBER_REDIRECT

  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(url.pathname)
  } catch {
    return DEFAULT_MEMBER_REDIRECT
  }
  if (decodedPathname.includes('\\') || decodedPathname.includes('\0')) {
    return DEFAULT_MEMBER_REDIRECT
  }

  if (url.pathname === '/member' || url.pathname.startsWith('/member/')) {
    return `${url.pathname}${url.search}${url.hash}`
  }
  return DEFAULT_MEMBER_REDIRECT
}

export function extractLiffRedirectPath(search: string): string {
  if (!search) return DEFAULT_MEMBER_REDIRECT
  const params = new URLSearchParams(search)

  // 1. Direct ?redirect=...
  const directRedirect = params.get('redirect')
  if (directRedirect) {
    const safe = getSafeMemberRedirect(directRedirect)
    if (safe !== DEFAULT_MEMBER_REDIRECT || directRedirect === '/member' || directRedirect.startsWith('/member/')) {
      return safe
    }
  }

  // 2. liff.state=...
  const liffState = params.get('liff.state')
  if (liffState) {
    let decodedState = liffState
    try {
      decodedState = decodeURIComponent(liffState)
    } catch {
      // Ignore URI error
    }

    if (decodedState.startsWith('?') || decodedState.includes('redirect=')) {
      const stateSearch = decodedState.startsWith('?') ? decodedState : `?${decodedState}`
      const stateParams = new URLSearchParams(stateSearch)
      const stateRedirect = stateParams.get('redirect')
      if (stateRedirect) {
        return getSafeMemberRedirect(stateRedirect)
      }
    }

    if (decodedState.startsWith('/')) {
      return getSafeMemberRedirect(decodedState)
    }
  }

  return DEFAULT_MEMBER_REDIRECT
}

const STORAGE_KEY = 'liff_redirect'

/** Luu redirect path vao sessionStorage truoc khi goi liff.login() */
export function storeLiffRedirectPath(path: string | null): void {
  try {
    if (path && path !== '/liff') {
      sessionStorage.setItem(STORAGE_KEY, path)
    }
  } catch { /* noop */ }
}

/** Doc va xoa redirect path tu sessionStorage (dung 1 lan) */
export function consumeLiffRedirectPath(): string | null {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY)
    if (path) {
      sessionStorage.removeItem(STORAGE_KEY)
      return path
    }
  } catch { /* noop */ }
  return null
}

/**
 * Redirect URI sach cho liff.login().
 * Redirect path phai duoc luu vao sessionStorage TRUOC KHI goi liff.login()
 * qua storeLiffRedirectPath(), sau do doc lai bang consumeLiffRedirectPath().
 */
export function getCleanLiffRedirectUri(href: string = typeof window !== 'undefined' ? window.location.href : 'https://gym-management-system-teal-three.vercel.app/liff'): string {
  try {
    const url = new URL(href)
    // Use current domain instead of hardcoded
    const baseUrl = `${window.location.protocol}//${window.location.host}`
    url.href = `${baseUrl}/liff`
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('liffClientId')
    url.searchParams.delete('liffRedirectUri')
    return url.toString()
  } catch {
    return `${window.location.origin}/liff`
  }
}

