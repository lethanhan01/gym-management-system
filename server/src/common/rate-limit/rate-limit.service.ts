import { Injectable } from '@nestjs/common'

/**
 * In-memory rate limiter don gian theo sliding window.
 * Reset khi restart process — chap nhan v1.0 single-instance.
 * V1.1 se chuyen sang Redis (Architecture §8 R12).
 */
@Injectable()
export class RateLimitService {
  private readonly store = new Map<string, number[]>()

  /**
   * Kiem tra xem key co duoc phep thuc hien them 1 request khong.
   * @param key       Khoa phan biet (vd "forgot-password:email@x.com")
   * @param limit     So request toi da trong window
   * @param windowMs  Kich thuoc window (ms)
   * @returns true neu con trong gioi han, false neu qua han muc
   */
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = (this.store.get(key) ?? []).filter((t) => now - t < windowMs)

    if (timestamps.length >= limit) {
      this.store.set(key, timestamps)
      return false
    }

    timestamps.push(now)
    this.store.set(key, timestamps)
    return true
  }
}
