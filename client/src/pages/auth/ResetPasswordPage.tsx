import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, KeyRound } from "lucide-react";
import { authService } from "@/services/auth.service";
import {
  AuthShell, BtnPrimary, TextLink,
  Field, PasswordField, ErrorMsg,
} from "./_authui";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navState = location.state as { devOtp?: string } | null;
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(navState?.devOtp ?? "");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPass !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authService.resetPassword(email, otp, newPass);
      setDone(true);
    } catch {
      setError("Mã OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-5 items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center rogym-sx-b1711891" >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#06c384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="rogym-sx-28816d54">
              Đặt lại thành công!
            </h1>
            <p className="rogym-sx-2a7c513c">
              Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại.
            </p>
          </div>
          <BtnPrimary onClick={() => navigate("/login")}>Đăng nhập ngay</BtnPrimary>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="text-center mb-1">
          <h1 className="rogym-sx-4d6285f7">
            Đặt lại mật khẩu
          </h1>
          <p className="rogym-sx-0a664e64">
            Nhập mã OTP đã được gửi vào email của bạn
          </p>
        </div>

        <Field label="Email" type="email" placeholder="ten@email.com" value={email} onChange={setEmail} icon={Mail} />
        <Field label="Mã OTP" placeholder="6 chữ số" value={otp} onChange={setOtp} icon={KeyRound} />
        <PasswordField label="Mật khẩu mới" placeholder="Tối thiểu 8 ký tự" value={newPass} onChange={setNewPass} icon={Lock} />
        <PasswordField label="Xác nhận mật khẩu" value={confirm} onChange={setConfirm} icon={Lock} />

        {error && <ErrorMsg message={error} />}

        <BtnPrimary type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : "Xác nhận đặt lại"}
        </BtnPrimary>

        <p className="text-center rogym-sx-0668b2bf" >
          Chưa có mã?{" "}
          <TextLink to="/forgot-password">Gửi lại OTP</TextLink>
        </p>
      </form>
    </AuthShell>
  );
}
