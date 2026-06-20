import { Link } from 'react-router-dom'
import HomeNavbar from '@/components/home/HomeNavbar'

export default function PackagesPage() {
  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            GÓI THÀNH VIÊN
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Chọn gói phù hợp mục tiêu của bạn. Hỗ trợ luyện tập và theo dõi tiến độ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              tier: 'CƠ BẢN',
              price: '599K',
              hot: false,
              f: ['Truy cập gym 24/7', 'Tủ đồ cá nhân', 'Khu vực cardio & tạ rời'],
            },
            {
              tier: 'THƯỢNG HẠNG',
              price: '999K',
              hot: true,
              f: ['4 buổi PT/tháng', 'Tư vấn dinh dưỡng', 'Lớp nhóm không giới hạn'],
            },
            {
              tier: 'ELITE VIP',
              price: '1.9M',
              hot: false,
              f: ['PT không giới hạn', 'Khu vực VIP riêng', 'Spa & phòng xông hơi'],
            },
          ].map((p) => (
            <div
              key={p.tier}
              className={`rounded-[40px] border border-white/10 bg-white/5 p-8 ${p.hot ? 'ring-1 ring-[#42e09e]' : ''}`}
            >
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                {p.tier}
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold">{p.price}</div>
                <div className="text-white/60">/Tháng</div>
              </div>
              <div className="mt-6 space-y-3">
                {p.f.map((x) => (
                  <div key={x} className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#42e09e] mt-2" />
                    <div className="text-white/70">{x}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  to="/member/subscription/setup"
                  className={
                    p.hot
                      ? 'rogym-btn rogym-btn--wide rogym-btn--dark'
                      : 'rogym-btn rogym-btn--wide rogym-btn--outline-white'
                  }
                >
                  <span>ĐĂNG KÝ NGAY</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
