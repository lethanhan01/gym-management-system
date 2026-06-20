import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { AuthShell, BtnPrimary, TextLink, ErrorMsg } from "@/pages/auth/_authui";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/authStore";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/* ── 6-box OTP input ── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[index]) {
        const next = [...value];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    onChange(next);
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className={`rogym-otp-input rounded-xl text-center text-lg font-bold outline-none transition-all duration-150 ${
            value[i] ? 'has-value' : ''
          }`}
        />
      ))}
    </div>
  );
}

/* ── Resend countdown button ── */
function ResendBtn({ onResend }: { onResend: () => void }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  function handleClick() {
    onResend();
    setSeconds(RESEND_SECONDS);
  }

  if (seconds > 0) {
    return (
      <span className="rogym-sx-a3c9452a">
        Gửi lại sau{" "}
        <span className="rogym-auth-highlight">{seconds}s</span>
      </span>
    );
  }

  return <TextLink onClick={handleClick}>Gửi lại mã</TextLink>;
}

/* ── Main page ── */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; password?: string; devOtp?: string } | null;
  const email = state?.email ?? "";
  const password = state?.password ?? "";
  const { setAuth } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(
    state?.devOtp ? state.devOtp.split("") : Array(OTP_LENGTH).fill(""),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const otp = digits.join("");
  const isFull = otp.length === OTP_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFull) return;
    setError("");
    setLoading(true);
    try {
      await authService.verifyEmail(email, otp);
      if (password) {
        const { user, token } = await authService.login(email, password);
        setAuth(user, token);
      }
      navigate("/member/register-success", { state: { email } });
    } catch (err) {
      const e = err as { response?: { status?: number } };
      const status = e?.response?.status;
      if (status === 410) {
        setError("Mã OTP đã hết hạn. Vui lòng gửi lại mã.");
      } else if (status === 404) {
        setError("Email không tìm thấy trong hệ thống.");
      } else if (status === 429) {
        setError("Quá nhiều lần thử. Vui lòng đợi trước khi thử lại.");
      } else {
        setError("Mã OTP không đúng hoặc đã hết hạn.");
      }
      setDigits(Array(OTP_LENGTH).fill(""));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      const result = await authService.resendVerification(email);
      if (result.devOtp) setDigits(result.devOtp.split(""));
    } catch {
      // silent — ResendBtn đã reset countdown, không cần báo lỗi
    }
  }

  return (
    <AuthShell backTo="/member/register" backLabel="Đăng ký">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center rogym-sx-cd8c4f95"
            
          >
            <Mail size={24} className="rogym-text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="rogym-sx-4d6285f7">
              Xác thực email
            </h1>
            <p className="rogym-sx-a29e4e5b">
              Nhập mã 6 chữ số đã được gửi đến
            </p>
            {email && (
              <p className="rogym-verify-email">
                {email}
              </p>
            )}
          </div>
        </div>

        {/* OTP boxes */}
        <OtpInput value={digits} onChange={setDigits} />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={!isFull || loading}>
          {loading ? "Đang xác thực..." : "Xác nhận"}
        </BtnPrimary>

        {/* Resend */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="rogym-sx-a3c9452a">
            Không nhận được mã?{" "}
          </span>
          <ResendBtn onResend={handleResend} />
        </div>

      </form>
    </AuthShell>
  );
}
