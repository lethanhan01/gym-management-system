const DEFAULT_MEMBER_REDIRECT = '/member'
const REDIRECT_PARSE_BASE = 'https://rogym.local'

export function getSafeMemberRedirect(rawRedirect: string | null): string {
  if (!rawRedirect) return DEFAULT_MEMBER_REDIRECT
  if (
    !rawRedirect.startsWith('/') ||
    rawRedirect.includes('://') ||
    rawRedirect.startsWith('//') ||
    rawRedirect.includes('\\') ||
    rawRedirect.includes('\0')
  ) {
    return DEFAULT_MEMBER_REDIRECT
  }

  let url: URL
  try {
    url = new URL(rawRedirect, REDIRECT_PARSE_BASE)
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
