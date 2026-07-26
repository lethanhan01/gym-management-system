import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authService } from "@/services/auth.service";
import { AuthShell, BtnPrimary, ErrorMsg } from "./_authui";
import { OtpInput, OTP_LENGTH, ResendOtpButton } from "./OtpInput";

export default function ResetPasswordPage() {
  const location = useLocation(); const navigate = useNavigate(); const { t } = useTranslation("auth");
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const otp = digits.join(""); const isFull = otp.length === OTP_LENGTH;
  useEffect(() => { if (!email) navigate("/forgot-password", { replace: true }); }, [email, navigate]);
  if (!email) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); if (!isFull) return;
    setError(""); setLoading(true);
    try { await authService.verifyResetOtp(email, otp); navigate("/reset-password/new-password", { replace: true }); }
    catch { setError(t("resetPassword.invalidOtp")); setDigits(Array(OTP_LENGTH).fill("")); }
    finally { setLoading(false); }
  }
  async function handleResend() { try { await authService.forgotPassword(email); setDigits(Array(OTP_LENGTH).fill("")); } catch { setError(t("resetPassword.resendFailed")); } }

  return <AuthShell backTo="/forgot-password" backLabel={t("resetPassword.backLabel")}><form onSubmit={handleSubmit} className="flex flex-col gap-6">
    <div className="flex flex-col items-center text-center gap-3"><div className="w-14 h-14 rounded-2xl flex items-center justify-center rogym-sx-cd8c4f95"><Mail size={24} className="rogym-text-accent" strokeWidth={1.5} /></div><div><h1 className="rogym-sx-4d6285f7">{t("resetPassword.title")}</h1><p className="rogym-sx-a29e4e5b">{t("resetPassword.subtitle")}</p><p className="rogym-verify-email">{email}</p></div></div>
    <OtpInput value={digits} onChange={setDigits} />
    {error && <ErrorMsg message={error} />}
    <BtnPrimary type="submit" disabled={!isFull || loading}>{loading ? t("resetPassword.verifying") : t("resetPassword.verifyOtp")}</BtnPrimary>
    <div className="flex items-center justify-center gap-1.5"><span className="rogym-sx-a3c9452a">{t("resetPassword.noCode")} </span><ResendOtpButton onResend={handleResend} /></div>
  </form></AuthShell>;
}
