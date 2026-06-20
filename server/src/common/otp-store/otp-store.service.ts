import { Injectable } from '@nestjs/common'

interface OtpEntry {
  codeHash: string
  expiresAt: number
  attemptCount: number
}

@Injectable()
export class OtpStoreService {
  private readonly store = new Map<string, OtpEntry>()

  private key(userId: bigint, purpose: string): string {
    return `${userId.toString()}:${purpose}`
  }

  set(userId: bigint, purpose: string, codeHash: string, ttlMs: number): void {
    this.store.set(this.key(userId, purpose), {
      codeHash,
      expiresAt: Date.now() + ttlMs,
      attemptCount: 0,
    })
  }

  get(userId: bigint, purpose: string): OtpEntry | undefined {
    return this.store.get(this.key(userId, purpose))
  }

  delete(userId: bigint, purpose: string): void {
    this.store.delete(this.key(userId, purpose))
  }

  incrementAttempts(userId: bigint, purpose: string): void {
    const entry = this.store.get(this.key(userId, purpose))
    if (entry) entry.attemptCount++
  }
}
