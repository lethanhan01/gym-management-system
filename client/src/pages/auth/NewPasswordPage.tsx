import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authService } from "@/services/auth.service";
import { AuthShell, BtnPrimary, ErrorMsg, PasswordField, TextLink } from "./_authui";

export default function NewPasswordPage() {
  const navigate = useNavigate(); const { t } = useTranslation("auth"); const { t: tVal } = useTranslation("validation");
  const [newPass, setNewPass] = useState(""); const [confirm, setConfirm] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false); const [expired, setExpired] = useState(false);
  async function handleSubmit(event: React.FormEvent) { event.preventDefault(); if (newPass !== confirm) { setError(tVal("password.mismatch")); return; } setError(""); setLoading(true); try { await authService.resetPassword(newPass); setDone(true); } catch { setError(t("resetPassword.grantExpired")); setExpired(true); } finally { setLoading(false); } }
  if (done) return <AuthShell><div className="flex flex-col gap-5 items-center text-center"><div className="w-16 h-16 rounded-2xl flex items-center justify-center rogym-sx-b1711891"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#06c384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><h1 className="rogym-sx-28816d54">{t("resetPassword.successTitle")}</h1><p className="rogym-sx-2a7c513c">{t("resetPassword.successBody")}</p></div><BtnPrimary onClick={() => navigate("/login")}>{t("resetPassword.loginNow")}</BtnPrimary></div></AuthShell>;
  return <AuthShell backTo="/forgot-password" backLabel={t("resetPassword.backLabel")}><form onSubmit={handleSubmit} className="flex flex-col gap-5"><div className="text-center mb-1"><h1 className="rogym-sx-4d6285f7">{t("resetPassword.newPasswordTitle")}</h1><p className="rogym-sx-0a664e64">{t("resetPassword.newPasswordSubtitle")}</p></div><PasswordField label={t("resetPassword.newPassword")} placeholder={t("resetPassword.newPasswordPlaceholder")} value={newPass} onChange={setNewPass} icon={Lock} /><PasswordField label={t("resetPassword.confirmPassword")} value={confirm} onChange={setConfirm} icon={Lock} />{error && <ErrorMsg message={error} />}{expired ? <TextLink onClick={() => navigate("/forgot-password", { replace: true })}>{t("resetPassword.startOver")}</TextLink> : <BtnPrimary type="submit" disabled={loading}>{loading ? t("resetPassword.submitting") : t("resetPassword.submit")}</BtnPrimary>}</form></AuthShell>;
}
