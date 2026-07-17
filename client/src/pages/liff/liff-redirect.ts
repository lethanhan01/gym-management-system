const DEFAULT_MEMBER_REDIRECT = '/member'

export function getSafeMemberRedirect(rawRedirect: string | null): string {
  if (!rawRedirect) return DEFAULT_MEMBER_REDIRECT
  if (
    rawRedirect.includes('://') ||
    rawRedirect.startsWith('//') ||
    rawRedirect.includes('\\') ||
    rawRedirect.includes('\0')
  ) {
    return DEFAULT_MEMBER_REDIRECT
  }
  if (rawRedirect === '/member' || rawRedirect.startsWith('/member/')) {
    return rawRedirect
  }
  return DEFAULT_MEMBER_REDIRECT
}
