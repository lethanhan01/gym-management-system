import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authService } from "@/services/auth.service";
import {
  AuthShell, BtnPrimary, TextLink, Field, ErrorMsg, G, T,
} from "./_authui";
import { useNavigate } from "react-router-dom";

function ForgotView({ onSent }: { onSent: (devOtp?: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      onSent(result.devOtp);
    } catch {
      setError(t("forgotPassword.emailNotFound"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="rogym-text-link rogym-text-link--muted rogym-sx-26e7fe5a"

      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>{t("forgotPassword.backToLogin")}</span>
      </button>

      <div className="text-center my-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 rogym-sx-cd8c4f95" >
          <Mail size={24} color={T} strokeWidth={1.5} />
        </div>
        <h1 className="rogym-sx-28816d54">
          {t("forgotPassword.title")}
        </h1>
        <p className="rogym-sx-a29e4e5b">
          {t("forgotPassword.subtitle")}
        </p>
      </div>

      <Field label={t("forgotPassword.email")} type="email" placeholder="ten@email.com" value={email} onChange={setEmail} icon={Mail} />

      {error && <ErrorMsg message={error} />}

      <BtnPrimary type="submit" disabled={loading}>
        {loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
      </BtnPrimary>
    </form>
  );
}

function SentView({ devOtp }: { devOtp?: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  return (
    <div className="flex flex-col gap-5 items-center text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center rogym-sx-b1711891" >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 6l-10 7L2 6" stroke={G} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div>
        <h1 className="rogym-sx-28816d54">
          {t("forgotPassword.sentTitle")}
        </h1>
        <p className="rogym-sx-2a7c513c">
          {t("forgotPassword.sentBody")}
        </p>
      </div>

      <BtnPrimary onClick={() => navigate("/reset-password", { state: { devOtp } })}>
        {t("forgotPassword.enterOtp")}
      </BtnPrimary>

      <p className="rogym-sx-a3c9452a">
        {t("forgotPassword.backToLoginQ")}{" "}
        <TextLink to="/login">{t("forgotPassword.loginLink")}</TextLink>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | undefined>();
  return (
    <AuthShell>
      {sent
        ? <SentView devOtp={devOtp} />
        : <ForgotView onSent={(otp) => { setDevOtp(otp); setSent(true); }} />}
    </AuthShell>
  );
}
