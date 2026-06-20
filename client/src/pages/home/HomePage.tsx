import { memo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Dumbbell,
  Zap,
  Users,
  Clock,
  Apple,
  Trophy,
  ArrowRight,
  Check,
  ChevronDown,
  Instagram,
  Facebook,
  Youtube,
  type LucideIcon,
} from 'lucide-react'

import heroImage from '@/assets/dashboard4-hero.webp'
import powerlift from '@/assets/powerlifting.jpg'
import hiit from '@/assets/hiittraining.jpg'
import pt1 from '@/assets/trainer1.jpg'
import pt2 from '@/assets/trainer2.jpg'
import pt3 from '@/assets/trainer3.jpg'
import HomeNavbar from '@/components/home/HomeNavbar'

const T = '#42e09e'
const GD = '#00492f'

type ButtonProps = {
  children: ReactNode
  to?: string
}

type TrainingCardProps = {
  img: string
  tag: string
  title: string
  desc: string
  width: number
  height: number
}

type CoachCardProps = {
  img: string
  name: string
  role: string
  bio: string
  width: number
  height: number
}

type Plan = { tier: string; price: string; unit: string; features: readonly string[]; hot: boolean }

const HERO_STATS = [
  ['2,500+', 'Thành viên'],
  ['15+', 'Huấn luyện viên'],
  ['98%', 'Hài lòng'],
] as const

const FEATURE_ITEMS: [LucideIcon, string][] = [
  [Dumbbell, 'THIẾT BỊ HIỆN ĐẠI'],
  [Users, 'HLV CHUYÊN NGHIỆP'],
  [Clock, 'MỞ CỬA 24/7'],
  [Trophy, 'CỘNG ĐỒNG MẠNH MẼ'],
  [Zap, 'KẾT QUẢ ĐƯỢC CHỨNG MINH'],
  [Apple, 'DINH DƯỠNG KHOA HỌC'],
]

const MARQUEE_GROUPS = [0, 1] as const

const TRAINING_PROGRAMS: TrainingCardProps[] = [
  {
    img: powerlift,
    tag: 'ELITE POWER',
    title: 'POWERLIFTING',
    desc: 'Tập trung vào ba bài tập cơ bản: Squat, Bench Press, và Deadlift để xây dựng sức mạnh tối đa.',
    width: 1080,
    height: 1920,
  },
  {
    img: hiit,
    tag: 'FAT BURNER',
    title: 'HIIT TRAINING',
    desc: 'Đốt cháy calo tối đa với các bài tập cường độ cao ngắt quãng, cải thiện sức bền tim mạch.',
    width: 1080,
    height: 1920,
  },
]

const EXTRA_PROGRAMS: [LucideIcon, string, string][] = [
  [Dumbbell, 'Strength Training', 'Xây dựng cơ bắp và sức mạnh cốt lõi'],
  [Zap, 'Yoga & Linh hoạt', 'Cân bằng cơ thể và tâm trí'],
  [Trophy, 'Boxing', 'Rèn luyện phản xạ và cardio tối ưu'],
]

const COACHES: CoachCardProps[] = [
  {
    img: pt1,
    name: 'PHAM YEN NHI',
    role: 'MASTER POWERLIFTER',
    bio: 'Chuyên gia dinh dưỡng và giảm cân khoa học.',
    width: 1179,
    height: 1470,
  },
  {
    img: pt2,
    name: 'TRINH VAN MINH',
    role: 'HIIT SPECIALIST',
    bio: 'Chuyên đào tạo kỹ thuật nâng tạ và phục hồi chức năng.',
    width: 736,
    height: 1104,
  },
  {
    img: pt3,
    name: 'LE THANH AN',
    role: 'STRENGTH COACH',
    bio: '10 năm kinh nghiệm huấn luyện thi đấu chuyên nghiệp.',
    width: 634,
    height: 951,
  },
]

const PRICING_PLANS: Plan[] = [
  {
    tier: 'CƠ BẢN',
    price: '599K',
    unit: '/Tháng',
    features: ['Truy cập gym 24/7', 'Tủ đồ cá nhân', 'Khu vực cardio & tạ rời'],
    hot: false,
  },
  {
    tier: 'THƯỢNG HẠNG',
    price: '999K',
    unit: '/Tháng',
    features: [
      'Tất cả quyền lợi Cơ Bản',
      '4 buổi PT/tháng',
      'Tư vấn dinh dưỡng',
      'Lớp nhóm không giới hạn',
      'Phục hồi chức năng',
    ],
    hot: true,
  },
  {
    tier: 'ELITE VIP',
    price: '1.9M',
    unit: '/Tháng',
    features: [
      'Tất cả quyền lợi Thượng Hạng',
      'PT không giới hạn',
      'Khu vực VIP riêng biệt',
      'Spa & phòng xông hơi',
      'Ưu tiên đặt lịch',
    ],
    hot: false,
  },
]

const FOOTER_COLUMNS = [
  {
    category: 'Chương trình',
    links: ['Powerlifting', 'HIIT Training', 'Yoga', 'Boxing', 'Strength'],
  },
  {
    category: 'Thông tin',
    links: ['Về chúng tôi', 'Chương trình tập luyện', 'Đội ngũ HLV', 'Gói thành viên', 'Liên hệ'],
  },
  { category: 'Hỗ trợ', links: ['Câu hỏi thường gặp', 'Liên hệ', 'Chính sách', 'Điều khoản'] },
] as const

const SOCIAL_LINKS: [LucideIcon, string][] = [
  [Facebook, 'Facebook'],
  [Instagram, 'Instagram'],
  [Youtube, 'YouTube'],
]

/* ── Shared CTA buttons ── */
const BtnPrimary = memo(function BtnPrimary({ children, to }: ButtonProps) {
  const className = 'rogym-btn rogym-btn--primary rogym-btn--hero'
  if (to) {
    return (
      <Link to={to} className={className}>
        <span>{children}</span>
      </Link>
    )
  }
  return (
    <button type="button" className={className}>
      <span>{children}</span>
    </button>
  )
})

const BtnOutline = memo(function BtnOutline({
  children,
  dark = false,
  to,
}: {
  children: ReactNode
  dark?: boolean
  to?: string
}) {
  const className = `rogym-btn rogym-btn--hero ${dark ? 'rogym-btn--outline-green-light' : 'rogym-btn--outline-white'}`
  if (to) {
    return (
      <Link to={to} className={className}>
        <span>{children}</span>
      </Link>
    )
  }
  return (
    <button type="button" className={className}>
      <span>{children}</span>
    </button>
  )
})

/* ── Hero ── */
const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative w-full min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          width={2560}
          height={1440}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="absolute w-full h-full object-cover object-center rogym-sx-a5d3f05c"
        />
        <div className="absolute inset-0 rogym-sx-c255490f" />
      </div>
      <div className="relative max-w-[1280px] mx-auto px-10 w-full pt-24 pb-20">
        <div className="max-w-[640px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 rounded-full rogym-sx-c3c1e2cb" />
            <span className="rogym-sx-e07a83ed">ROGYM — Đỉnh cao phong độ</span>
          </div>
          <h1 className="uppercase leading-none mb-6 rogym-sx-5ba16c42">
            KHƠI NGUỒN
            <br />
            <span className="rogym-sx-f27dac31">SỨC MẠNH</span>
          </h1>
          <p className="mb-8 max-w-[500px] rogym-sx-f2f202e3">
            Nâng tầm giới hạn thể chất của bạn ngay hôm nay cùng đội ngũ chuyên gia hàng đầu và
            thiết bị hiện đại nhất.
          </p>
          <div className="flex flex-wrap gap-4">
            <BtnPrimary to="/login">BẮT ĐẦU NGAY</BtnPrimary>
            <BtnOutline to="/programs">TÌM HIỂU THÊM</BtnOutline>
          </div>
          <div className="mt-14 flex gap-10 flex-wrap">
            {HERO_STATS.map(([n, l]) => (
              <div key={l}>
                <div className="rogym-sx-7cd3ffb3">{n}</div>
                <div className="rogym-sx-d26a35f2">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 rogym-sx-448054ab">
        <span className="rogym-sx-a3416a9a">Cuộn xuống</span>
        <ChevronDown size={16} color="#fff" />
      </div>
    </section>
  )
})

/* ── Feature marquee ── */
const FeatureBar = memo(function FeatureBar() {
  return (
    <div className="rogym-marquee w-full overflow-hidden py-5 border-y rogym-sx-45cdf5dd">
      <div className="rogym-marquee__track">
        {MARQUEE_GROUPS.map((groupIndex) => (
          <div key={groupIndex} className="rogym-marquee__group" aria-hidden={groupIndex === 1}>
            {FEATURE_ITEMS.map(([Icon, text]) => (
              <span
                key={`${groupIndex}-${text}`}
                className="flex items-center gap-3 font-bold text-sm uppercase tracking-[0.18em] rogym-sx-d684cd20"
              >
                <Icon size={15} color={GD} strokeWidth={2.5} />
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})

/* ── Training card ── */
const TrainingCard = memo(function TrainingCard({
  img,
  tag,
  title,
  desc,
  width,
  height,
}: TrainingCardProps) {
  return (
    <div className="rogym-media-card rogym-media-card--dark relative rounded-[40px] overflow-hidden cursor-pointer rogym-sx-6063d874">
      <img
        src={img}
        alt={title}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        sizes="(min-width: 768px) 50vw, 100vw"
        className="rogym-media-card__image absolute inset-0 w-full h-full object-cover rogym-sx-e36c668b"
      />
      <div className="absolute inset-0 rogym-sx-23c73807" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <span className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 rogym-sx-f1d39d6f">
          {tag}
        </span>
        <div className="uppercase mb-3 rogym-sx-7989cb59">{title}</div>
        <p className="rogym-sx-0d114162">{desc}</p>
        <button
          type="button"
          className="rogym-text-link rogym-text-link--accent mt-4 rogym-sx-f27dac31"
        >
          <span className="text-sm font-bold uppercase tracking-widest rogym-sx-3278ee06">
            CHI TIẾT
          </span>
          <ArrowRight size={14} color={T} />
        </button>
      </div>
    </div>
  )
})

/* ── Training section ── */
const TrainingSection = memo(function TrainingSection() {
  return (
    <section className="w-full py-32 relative rogym-sx-d8b3875b">
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4 rogym-sx-9cd1aaa6">
              LEVEL UP YOUR GAME
            </div>
            <h2 className="uppercase leading-none rogym-sx-37943c0d">
              CHƯƠNG TRÌNH
              <br />
              TẬP LUYỆN
            </h2>
          </div>
          <div className="h-1 w-32 rounded-full rogym-sx-c3c1e2cb" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {TRAINING_PROGRAMS.map((program) => (
            <TrainingCard key={program.title} {...program} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXTRA_PROGRAMS.map(([Icon, name, desc]) => (
            <div key={name} className="rogym-mini-card p-6 rounded-2xl cursor-pointer">
              <div className="mb-3 w-10 h-10 rounded-xl flex items-center justify-center rogym-sx-30aed1d5">
                <Icon size={20} color={T} strokeWidth={2} />
              </div>
              <div className="font-semibold mb-1 rogym-sx-8c53a34a">{name}</div>
              <div className="rogym-sx-add1c712">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
})

/* ── Coach card ── */
const CoachCard = memo(function CoachCard({ img, name, role, bio, width, height }: CoachCardProps) {
  return (
    <div className="rogym-media-card rogym-media-card--light relative cursor-pointer rogym-sx-38f967f1">
      <div className="rogym-media-card__frame rounded-[40px] rogym-sx-cbae9426">
        <div className="absolute inset-0 rounded-[40px] rogym-sx-a428c28c" />
        <img
          src={img}
          alt={name}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          sizes="(min-width: 768px) 33vw, 100vw"
          className="rogym-media-card__image w-full h-full object-cover"
        />
        <div className="rogym-media-card__tint absolute inset-0 rounded-[40px] rogym-sx-3592cfe5" />
      </div>
      <div className="text-center mt-5">
        <div className="uppercase rogym-sx-f7b2327a">{name}</div>
        <div className="font-semibold uppercase tracking-wider mt-1 rogym-sx-7479d1c6">{role}</div>
        <div className="mt-1.5 rogym-sx-dde31fe9">{bio}</div>
      </div>
    </div>
  )
})

/* ── Coaches section ── */
const CoachSection = memo(function CoachSection() {
  return (
    <section className="w-full py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rogym-sx-bee9a30c" />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5 rogym-sx-339ac6c6">ĐỘI NGŨ CHUYÊN GIA</h2>
          <p className="uppercase font-semibold tracking-[0.15em] opacity-50 rogym-sx-8b36c264">
            DẪN DẮT BẠN ĐẾN ĐỈNH CAO PHONG ĐỘ
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {COACHES.map((coach) => (
            <CoachCard key={coach.name} {...coach} />
          ))}
        </div>
        <div className="flex justify-center mt-16">
          <BtnOutline dark to="/trainers">
            Xem tất cả huấn luyện viên
          </BtnOutline>
        </div>
      </div>
    </section>
  )
})

/* ── Pricing ── */
const PricingCard = memo(function PricingCard({ plan }: { plan: Plan }) {
  const { hot } = plan
  return (
    <div
      className={`rogym-pricing-card relative rounded-[40px] p-8 flex flex-col cursor-pointer h-full ${
        hot ? 'rogym-pricing-card--featured' : ''
      }`}
    >
      {hot && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest rogym-sx-15e311e3">
          PHỔ BIẾN NHẤT
        </div>
      )}
      <div className="rogym-pricing-card__tier text-xs font-bold uppercase tracking-[0.25em] mb-4">
        {plan.tier}
      </div>
      <div className="flex items-baseline gap-2 mb-8">
        <span className="rogym-pricing-card__price">{plan.price}</span>
        <span className="rogym-pricing-card__unit">{plan.unit}</span>
      </div>
      <div className="flex flex-col gap-4 mb-10 flex-1">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-3">
            <div className="rogym-pricing-card__check w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Check size={11} strokeWidth={2.5} />
            </div>
            <span className="rogym-pricing-card__feature">{f}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`rogym-btn rogym-btn--wide ${
          hot ? 'rogym-btn--dark' : 'rogym-btn--outline-white'
        }`}
      >
        <span>ĐĂNG KÝ NGAY</span>
      </button>
    </div>
  )
})

const PricingSection = memo(function PricingSection() {
  return (
    <section className="w-full py-32 relative rogym-sx-7b5fda64">
      <div className="absolute inset-0 pointer-events-none rogym-sx-49e5c51a" />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5 rogym-sx-37943c0d">GÓI THÀNH VIÊN</h2>
          <div className="h-1 w-24 rounded-full mx-auto rogym-sx-c3c1e2cb" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-8">
          {PRICING_PLANS.map((p) => (
            <PricingCard key={p.tier} plan={p} />
          ))}
        </div>
        <p className="text-center mt-12 rogym-sx-0ac692a1">
          * Tất cả gói đều có thể hủy bất kỳ lúc nào. Dùng thử miễn phí 7 ngày.
        </p>
      </div>
    </section>
  )
})

/* ── CTA Banner ── */
const CTABanner = memo(function CTABanner() {
  return (
    <section className="w-full py-28 relative overflow-hidden rogym-sx-3645accf">
      <div className="absolute inset-0 pointer-events-none rogym-sx-4c20acf6" />
      <div className="max-w-[1280px] mx-auto px-10 text-center relative">
        <p className="uppercase font-bold tracking-[0.28em] mb-4 rogym-sx-4c894103">
          BẮT ĐẦU HÀNH TRÌNH CỦA BẠN
        </p>
        <h2 className="uppercase leading-none mb-8 rogym-sx-1297467b">
          SẴN SÀNG PHÁ VỠ
          <br />
          <span className="rogym-sx-f27dac31">GIỚI HẠN?</span>
        </h2>
        <p className="max-w-md mx-auto mb-10 rogym-sx-31cf2166">
          Đăng ký thử miễn phí 7 ngày và cảm nhận sự khác biệt ngay hôm nay.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <BtnPrimary to="/login">THỬ MIỄN PHÍ 7 NGÀY</BtnPrimary>
          <BtnOutline to="/contact">LIÊN HỆ TƯ VẤN</BtnOutline>
        </div>
      </div>
    </section>
  )
})

/* ── Footer ── */
const Footer = memo(function Footer() {
  return (
    <footer className="w-full py-20 border-t rogym-sx-12fc93c6">
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 rogym-sx-1c639e32">
                <Dumbbell size={16} color="#fff" strokeWidth={2.2} />
              </div>
              <span className="rogym-sx-7722cdfa">ROGYM</span>
            </div>
            <p className="mb-6 rogym-sx-6c6fd0c8">
              Nơi giới hạn bị phá vỡ, sức mạnh được rèn giũa. Hành trình của bạn bắt đầu từ đây.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(([Icon, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="rogym-btn rogym-btn--icon rogym-btn--elevated"
                >
                  <Icon size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          {FOOTER_COLUMNS.map(({ category, links }) => (
            <div key={category}>
              <div className="text-xs font-bold uppercase tracking-[0.2em] mb-5 rogym-sx-e539da0b">
                {category}
              </div>
              <div className="flex flex-col gap-3">
                {links.map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="rogym-text-link rogym-text-link--muted text-sm rogym-sx-8b0393ce"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 pt-8 border-t rogym-sx-3636a8d8">
          <span className="rogym-sx-f419f934">© 2026 RoGym. All rights reserved.</span>
          <span className="rogym-sx-f419f934">Số 1 Đại Cồ Việt, Bạch Mai, Hà Nội, Việt Nam</span>
        </div>
      </div>
    </footer>
  )
})

/* ── HomePage ── */
const HomePage = memo(function HomePage() {
  return (
    <div className="rogym-page">
      <HomeNavbar />
      <HeroSection />
      <FeatureBar />
      <TrainingSection />
      <CoachSection />
      <PricingSection />
      <CTABanner />
      <Footer />
    </div>
  )
})

export default HomePage
