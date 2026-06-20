import { OtpStoreService } from './otp-store.service'

describe('OtpStoreService', () => {
  let service: OtpStoreService
  const userId = 1n
  const purpose = 'reset_password'
  const codeHash = '$2b$10$hashedvalue'

  beforeEach(() => {
    service = new OtpStoreService()
  })

  describe('set', () => {
    it('stores an OTP entry with correct hash and zero attempt count', () => {
      service.set(userId, purpose, codeHash, 60_000)

      const entry = service.get(userId, purpose)
      expect(entry).toBeDefined()
      expect(entry!.codeHash).toBe(codeHash)
      expect(entry!.attemptCount).toBe(0)
    })

    it('sets expiresAt roughly ttlMs from now', () => {
      const before = Date.now()
      service.set(userId, purpose, codeHash, 60_000)
      const after = Date.now()

      const entry = service.get(userId, purpose)!
      expect(entry.expiresAt).toBeGreaterThanOrEqual(before + 60_000)
      expect(entry.expiresAt).toBeLessThanOrEqual(after + 60_000)
    })

    it('overwrites existing entry for the same userId+purpose, resetting attemptCount', () => {
      service.set(userId, purpose, 'old_hash', 60_000)
      service.incrementAttempts(userId, purpose)
      service.set(userId, purpose, 'new_hash', 30_000)

      const entry = service.get(userId, purpose)!
      expect(entry.codeHash).toBe('new_hash')
      expect(entry.attemptCount).toBe(0)
    })

    it('stores entries for different purposes on same userId independently', () => {
      service.set(userId, 'reset_password', 'hash_a', 60_000)
      service.set(userId, 'verify_email', 'hash_b', 60_000)

      expect(service.get(userId, 'reset_password')!.codeHash).toBe('hash_a')
      expect(service.get(userId, 'verify_email')!.codeHash).toBe('hash_b')
    })

    it('stores entries for different userIds on same purpose independently', () => {
      service.set(1n, purpose, 'hash_user1', 60_000)
      service.set(2n, purpose, 'hash_user2', 60_000)

      expect(service.get(1n, purpose)!.codeHash).toBe('hash_user1')
      expect(service.get(2n, purpose)!.codeHash).toBe('hash_user2')
    })
  })

  describe('get', () => {
    it('returns undefined for an entry that was never set', () => {
      expect(service.get(userId, purpose)).toBeUndefined()
    })

    it('returns undefined for a different purpose on same userId', () => {
      service.set(userId, purpose, codeHash, 60_000)
      expect(service.get(userId, 'other_purpose')).toBeUndefined()
    })

    it('returns undefined for a different userId on same purpose', () => {
      service.set(userId, purpose, codeHash, 60_000)
      expect(service.get(999n, purpose)).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('removes the entry so subsequent get returns undefined', () => {
      service.set(userId, purpose, codeHash, 60_000)
      service.delete(userId, purpose)

      expect(service.get(userId, purpose)).toBeUndefined()
    })

    it('does not throw when deleting a non-existent entry', () => {
      expect(() => service.delete(userId, purpose)).not.toThrow()
    })

    it('deletes only the targeted entry, leaving others intact', () => {
      service.set(1n, purpose, 'hash1', 60_000)
      service.set(2n, purpose, 'hash2', 60_000)

      service.delete(1n, purpose)

      expect(service.get(1n, purpose)).toBeUndefined()
      expect(service.get(2n, purpose)!.codeHash).toBe('hash2')
    })
  })

  describe('incrementAttempts', () => {
    it('increments attemptCount by 1 each call', () => {
      service.set(userId, purpose, codeHash, 60_000)

      service.incrementAttempts(userId, purpose)
      expect(service.get(userId, purpose)!.attemptCount).toBe(1)

      service.incrementAttempts(userId, purpose)
      expect(service.get(userId, purpose)!.attemptCount).toBe(2)
    })

    it('does not throw when the entry does not exist', () => {
      expect(() => service.incrementAttempts(userId, purpose)).not.toThrow()
    })

    it('mutates the stored entry in place (same object reference)', () => {
      service.set(userId, purpose, codeHash, 60_000)
      const entryBefore = service.get(userId, purpose)!

      service.incrementAttempts(userId, purpose)

      expect(entryBefore.attemptCount).toBe(1)
    })
  })
})
