import { describe, expect, it } from 'vitest'
import { extractLiffRedirectPath, getSafeMemberRedirect } from './liff-redirect'

describe('liff-redirect', () => {
  describe('getSafeMemberRedirect', () => {
    it('returns /member when rawRedirect is null or empty', () => {
      expect(getSafeMemberRedirect(null)).toBe('/member')
      expect(getSafeMemberRedirect('')).toBe('/member')
    })

    it('returns rawRedirect when it starts with /member', () => {
      expect(getSafeMemberRedirect('/member')).toBe('/member')
      expect(getSafeMemberRedirect('/member/workout/sessions')).toBe('/member/workout/sessions')
      expect(getSafeMemberRedirect('/member/subscription/setup')).toBe('/member/subscription/setup')
    })

    it('rejects non-member paths or open redirects', () => {
      expect(getSafeMemberRedirect('/admin')).toBe('/member')
      expect(getSafeMemberRedirect('https://evil.com')).toBe('/member')
      expect(getSafeMemberRedirect('//evil.com')).toBe('/member')
      expect(getSafeMemberRedirect('/\\evil.com')).toBe('/member')
    })
  })

  describe('extractLiffRedirectPath', () => {
    it('extracts direct redirect parameter', () => {
      expect(extractLiffRedirectPath('?redirect=%2Fmember%2Fworkout')).toBe('/member/workout')
    })

    it('extracts redirect parameter encoded inside liff.state', () => {
      expect(extractLiffRedirectPath('?liff.state=%3Fredirect%3D%252Fmember%252Fsubscription%252Fsetup')).toBe(
        '/member/subscription/setup'
      )
      expect(extractLiffRedirectPath('?liff.state=%3Fredirect%3D%2Fmember%2Fworkout')).toBe(
        '/member/workout'
      )
    })

    it('extracts direct path encoded inside liff.state', () => {
      expect(extractLiffRedirectPath('?liff.state=%2Fmember%2Fattendance')).toBe('/member/attendance')
    })

    it('defaults to /member for empty or invalid params', () => {
      expect(extractLiffRedirectPath('')).toBe('/member')
      expect(extractLiffRedirectPath('?liff.state=invalid')).toBe('/member')
    })
  })
})
