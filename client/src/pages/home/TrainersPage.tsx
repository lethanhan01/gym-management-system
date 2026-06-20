import { Link } from 'react-router-dom'
import HomeNavbar from '@/components/home/HomeNavbar'

const TRAINERS = [
  {
    n: 'PHẠM YẾN NHI',
    r: 'MASTER POWERLIFTER',
    b: 'Chuyên gia dinh dưỡng và giảm cân khoa học.',
  },
  {
    n: 'TRỊNH VĂN MINH',
    r: 'HIIT SPECIALIST',
    b: 'Đào tạo kỹ thuật nâng tạ và phục hồi chức năng.',
  },
  {
    n: 'LÊ THÀNH AN',
    r: 'STRENGTH COACH',
    b: '10 năm kinh nghiệm huấn luyện thi đấu chuyên nghiệp.',
  },
]

export default function TrainersPage() {
  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            HUẤN LUYỆN VIÊN
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            Đội ngũ HLV chuyên môn cao, đồng hành cùng bạn từ kỹ thuật đến lộ trình tập luyện và
            dinh dưỡng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRAINERS.map((c) => (
            <div key={c.n} className="rounded-[40px] border border-white/10 bg-white/5 p-7">
              <div className="text-lg font-bold">{c.n}</div>
              <div className="text-sm font-semibold uppercase tracking-widest text-[#42e09e] mt-1">
                {c.r}
              </div>
              <div className="mt-3 text-white/70">{c.b}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex gap-4 flex-wrap">
          <Link
            to="/member/choose-trainer"
            className="rogym-btn rogym-btn--primary rogym-btn--hero"
          >
            <span>CHỌN HLV</span>
          </Link>
          <Link to="/contact" className="rogym-btn rogym-btn--hero rogym-btn--outline-white">
            <span>LIÊN HỆ TƯ VẤN</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
