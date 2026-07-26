import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "./_authui";

export const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function OtpInput({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  function handleChange(index: number, input: string) {
    const digit = input.replace(/\D/g, "").slice(-1);
    const next = [...value]; next[index] = digit; onChange(next);
    if (digit && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }
  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (value[index]) { const next = [...value]; next[index] = ""; onChange(next); }
      else if (index > 0) refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    for (let index = 0; index < digits.length; index += 1) next[index] = digits[index];
    onChange(next); refs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  }
  return <div className="flex gap-2.5 justify-center">{Array.from({ length: OTP_LENGTH }).map((_, index) => <input key={index} ref={(element) => { refs.current[index] = element; }} aria-label={`OTP digit ${index + 1}`} type="text" inputMode="numeric" maxLength={1} value={value[index] ?? ""} onChange={(event) => handleChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={handlePaste} onFocus={(event) => event.currentTarget.select()} className={`rogym-otp-input rounded-xl text-center text-lg font-bold outline-none transition-all duration-150 ${value[index] ? "has-value" : ""}`} />)}</div>;
}

export function ResendOtpButton({ onResend }: { onResend: () => Promise<void> | void }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const { t } = useTranslation("auth");
  useEffect(() => { if (seconds <= 0) return; const id = window.setTimeout(() => setSeconds((current) => current - 1), 1000); return () => window.clearTimeout(id); }, [seconds]);
  async function handleClick() { await onResend(); setSeconds(RESEND_SECONDS); }
  if (seconds > 0) return <span className="rogym-sx-a3c9452a">{t("verifyEmail.resendCountdown")} <span className="rogym-auth-highlight">{seconds}s</span></span>;
  return <TextLink onClick={() => { void handleClick(); }}>{t("verifyEmail.resendBtn")}</TextLink>;
}
