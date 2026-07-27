import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthShell, BtnPrimary, ErrorMsg } from "@/pages/auth/_authui";
import { OtpInput, OTP_LENGTH, ResendOtpButton } from "@/pages/auth/OtpInput";
import { authService } from "@/services/auth.service";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string } | null;
  const email = state?.email ?? "";
  const { t } = useTranslation("auth");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otp = digits.join("");
  const isFull = otp.length === OTP_LENGTH;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isFull) return;
    setError(""); setLoading(true);
    try {
      await authService.verifyEmail(email, otp);
      navigate(`/login?email=${encodeURIComponent(email)}`, { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(status === 410 ? t("verifyEmail.otpExpired") : status === 404 ? t("verifyEmail.emailNotFound") : status === 429 ? t("verifyEmail.tooManyAttempts") : t("verifyEmail.invalidOtp"));
      setDigits(Array(OTP_LENGTH).fill(""));
    } finally { setLoading(false); }
  }
  async function handleResend() { try { await authService.resendVerification(email); } catch { /* Preserve the existing quiet resend behaviour. */ } }

  return <AuthShell backTo="/member/register" backLabel={t("verifyEmail.backLabel")}><form onSubmit={handleSubmit} className="flex flex-col gap-6">
    <div className="flex flex-col items-center text-center gap-3"><div className="w-14 h-14 rounded-2xl flex items-center justify-center rogym-sx-cd8c4f95"><Mail size={24} className="rogym-text-accent" strokeWidth={1.5} /></div><div><h1 className="rogym-sx-4d6285f7">{t("verifyEmail.title")}</h1><p className="rogym-sx-a29e4e5b">{t("verifyEmail.subtitle")}</p>{email && <p className="rogym-verify-email">{email}</p>}</div></div>
    <OtpInput value={digits} onChange={setDigits} />
    {error && <ErrorMsg message={error} />}
    <BtnPrimary type="submit" disabled={!isFull || loading}>{loading ? t("verifyEmail.submitting") : t("verifyEmail.submit")}</BtnPrimary>
    <div className="flex items-center justify-center gap-1.5"><span className="rogym-sx-a3c9452a">{t("verifyEmail.noCode")} </span><ResendOtpButton onResend={handleResend} /></div>
  </form></AuthShell>;
}
