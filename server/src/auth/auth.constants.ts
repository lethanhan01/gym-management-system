export const OTP_TTL_MS = 10 * 60 * 1000      // 10 phut
export const OTP_RATE_LIMIT = 3               // 3 lan
export const OTP_RATE_WINDOW_MS = 60 * 60 * 1000  // trong 1 gio
export const OTP_MAX_ATTEMPTS = 5

/**
 * DEMO ONLY — master OTP cho demo deploy khi chua co SMTP that.
 * Bat bang env: DEMO_MASTER_OTP=111111. Neu khong set -> tat (logic OTP that giu nguyen).
 * KHONG bao gio set bien nay o moi truong production that.
 */
export const DEMO_MASTER_OTP = process.env.DEMO_MASTER_OTP || ''
export const isDemoOtp = (otp: string): boolean => DEMO_MASTER_OTP !== '' && otp === DEMO_MASTER_OTP
