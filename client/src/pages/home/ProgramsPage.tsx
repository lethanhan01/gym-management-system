import { Link } from 'react-router-dom'
import HomeNavbar from '@/components/home/HomeNavbar'

export default function ProgramsPage() {
  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            CHƯƠNG TRÌNH TẬP LUYỆN
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Khám phá các lộ trình tập luyện được thiết kế theo mục tiêu: sức mạnh, giảm mỡ, linh
            hoạt và hiệu suất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: 'POWERLIFTING', d: 'Squat, Bench Press, Deadlift — tập trung sức mạnh tối đa.' },
            { t: 'HIIT TRAINING', d: 'Cường độ cao ngắt quãng — tối ưu cardio và đốt mỡ.' },
            { t: 'YOGA & LINH HOẠT', d: 'Giãn cơ, cân bằng, cải thiện khả năng vận động.' },
          ].map((x) => (
            <div key={x.t} className="rounded-[40px] border border-white/10 bg-white/5 p-7">
              <div className="text-sm font-bold uppercase tracking-widest text-[#42e09e]">
                {x.t}
              </div>
              <div className="mt-3 text-lg font-semibold">{x.d.split('—')[0]}</div>
              <div className="mt-2 text-white/70">{x.d}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex gap-4 flex-wrap">
          <Link to="/member/register" className="rogym-btn rogym-btn--primary rogym-btn--hero">
            <span>ĐĂNG KÝ THÀNH VIÊN</span>
          </Link>
          <Link to="/contact" className="rogym-btn rogym-btn--hero rogym-btn--outline-white">
            <span>LIÊN HỆ TƯ VẤN</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
