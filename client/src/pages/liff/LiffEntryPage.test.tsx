import { describe, expect, it } from 'vitest'
import { getSafeMemberRedirect } from './liff-redirect'

describe('getSafeMemberRedirect', () => {
  it('allows internal member routes', () => {
    expect(getSafeMemberRedirect('/member')).toBe('/member')
    expect(getSafeMemberRedirect('/member?tab=profile')).toBe('/member?tab=profile')
    expect(getSafeMemberRedirect('/member#profile')).toBe('/member#profile')
    expect(getSafeMemberRedirect('/member/workout/session/123')).toBe(
      '/member/workout/session/123'
    )
    expect(getSafeMemberRedirect('/member/workout/sessions?sessionId=123')).toBe(
      '/member/workout/sessions?sessionId=123'
    )
  })

  it('falls back for external or non-member redirects', () => {
    expect(getSafeMemberRedirect('https://evil.example/member')).toBe('/member')
    expect(getSafeMemberRedirect('//evil.example/member')).toBe('/member')
    expect(getSafeMemberRedirect('/member\\evil')).toBe('/member')
    expect(getSafeMemberRedirect('/member\0evil')).toBe('/member')
    expect(getSafeMemberRedirect('/member/%5Cevil')).toBe('/member')
    expect(getSafeMemberRedirect('/member%00evil')).toBe('/member')
    expect(getSafeMemberRedirect('/login')).toBe('/member')
    expect(getSafeMemberRedirect('/member.evil')).toBe('/member')
    expect(getSafeMemberRedirect('member')).toBe('/member')
    expect(getSafeMemberRedirect('javascript:alert(1)')).toBe('/member')
  })
})
