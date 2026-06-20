import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, ArrowRight } from "lucide-react";
import gym from "@/assets/gym-bg-optimized.jpg";
import { T, BtnPrimary } from "@/pages/auth/_authui";

/* ── Animated check ring ── */
function CheckIcon() {
  return (
    <div className="relative flex items-center justify-center rogym-sx-81c0f5bd" >
      <div
        className="absolute rounded-full rogym-sx-b11a482f"
        
      />
      <div
        className="absolute rounded-full rogym-sx-33370ee3"
        
      />
      <div className="rogym-register-success__check relative flex items-center justify-center rounded-full">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden rogym-sx-7b5fda64"
      
    >
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img
          src={gym}
          alt=""
          className="absolute w-full h-full object-cover object-center rogym-sx-27af414f"
          
        />
        <div
          className="absolute inset-0 rogym-sx-5309569b"
          
        />
        <div className="absolute inset-0 rogym-sx-7bbccc2e"  />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full mx-4 rogym-sx-af383d3e" >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="rogym-brand-icon w-9 h-9 rounded-xl flex items-center justify-center">
            <Dumbbell size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="rogym-sx-f326e6e8">
            ROGYM
          </span>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8 flex flex-col gap-6 rogym-sx-a4968112"
          
        >
          {/* Check icon */}
          <div className="flex justify-center pt-2">
            <CheckIcon />
          </div>

          {/* Heading */}
          <div className="text-center">
            <div className="rogym-register-success__eyebrow">
              XÁC THỰC THÀNH CÔNG
            </div>
            <h1
              className="rogym-sx-71f5317f"
            >
              Chào mừng đến RoGym!
            </h1>
            <p
              className="rogym-sx-2a7c513c"
            >
              Tài khoản đã được xác thực. Bước tiếp theo là kích hoạt gói tập để bắt đầu sử dụng hệ thống.
            </p>
          </div>

          {/* Info box */}
          <div
            className="rounded-xl px-4 py-3.5 flex flex-col gap-2 rogym-sx-1cbde76c"
            
          >
            {[
              "Nhập mã gói đã mua tại quầy",
              "Hoặc chọn và mua gói mới trực tuyến",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2.5">
                <div
                  className="flex items-center justify-center rounded-full shrink-0 mt-0.5 rogym-sx-93d5e654"
                  
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l1.5 1.5L6.5 2" stroke={T} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="rogym-sx-118408dc">
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <BtnPrimary onClick={() => navigate("/member/subscription/setup")}>
            <span>Tới gói tập của tôi</span>
            <ArrowRight size={15} strokeWidth={2} />
          </BtnPrimary>
        </div>
      </div>

    </div>
  );
}
