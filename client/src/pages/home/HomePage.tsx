import { memo } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
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

import heroImage from '@/assets/cover_photo.jpg'
import powerlift from '@/assets/powerlifting.jpg'
import hiit from '@/assets/hiittraining.jpg'
import pt1 from '@/assets/trainer1.jpg'
import pt2 from '@/assets/trainer2.jpg'
import pt3 from '@/assets/trainer3.jpg'
import HomeNavbar from '@/components/home/HomeNavbar'

const T = '#42e09e'
const GD = '#00492f'



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

const HERO_STATS_NUMBERS = ['2,500+', '15+', '98%'] as const

const FEATURE_ICONS: LucideIcon[] = [Dumbbell, Users, Clock, Trophy, Zap, Apple]

const MARQUEE_GROUPS = [0, 1] as const


const SOCIAL_LINKS: [LucideIcon, string][] = [
  [Facebook, 'Facebook'],
  [Instagram, 'Instagram'],
  [Youtube, 'YouTube'],
]

const FOOTER_PROGRAM_LINKS = ['Powerlifting', 'HIIT Training', 'Yoga', 'Boxing', 'Strength']


/* ── Hero ── */
const HeroSection = memo(function HeroSection() {
  const { t } = useTranslation('home')

  const heroStatLabels = [
    t('hero.statsMembers'),
    t('hero.statsTrainers'),
    t('hero.statsSatisfied'),
  ]

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
            <span className="rogym-sx-e07a83ed">{t('hero.tagline')}</span>
          </div>
          <h1 className="uppercase leading-none mb-6 rogym-sx-5ba16c42">
            {t('hero.heading1')}
            <br />
            <span className="rogym-sx-f27dac31">{t('hero.heading2')}</span>
          </h1>
          <p className="mb-8 max-w-[500px] rogym-sx-f2f202e3">
            {t('hero.body')}
          </p>
          <div className="flex flex-wrap gap-4">
            <ButtonLink to="/login" variant="primary" size="hero">{t('hero.ctaStart')}</ButtonLink>
            <ButtonLink to="/programs" variant="outline-white" size="hero">{t('hero.ctaLearnMore')}</ButtonLink>
          </div>
          <div className="mt-14 flex gap-10 flex-wrap">
            {HERO_STATS_NUMBERS.map((n, i) => (
              <div key={n}>
                <div className="rogym-sx-7cd3ffb3">{n}</div>
                <div className="rogym-sx-d26a35f2">{heroStatLabels[i]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 rogym-sx-448054ab">
        <span className="rogym-sx-a3416a9a">{t('hero.scrollDown')}</span>
        <ChevronDown size={16} color="#fff" />
      </div>
    </section>
  )
})

/* ── Feature marquee ── */
const FeatureBar = memo(function FeatureBar() {
  const { t } = useTranslation('home')

  const featureTexts = [
    t('features.equipment'),
    t('features.trainers'),
    t('features.hours'),
    t('features.community'),
    t('features.results'),
    t('features.nutrition'),
  ]

  return (
    <div className="rogym-marquee w-full overflow-hidden py-5 border-y rogym-sx-45cdf5dd">
      <div className="rogym-marquee__track">
        {MARQUEE_GROUPS.map((groupIndex) => (
          <div key={groupIndex} className="rogym-marquee__group" aria-hidden={groupIndex === 1}>
            {FEATURE_ICONS.map((Icon, idx) => (
              <span
                key={`${groupIndex}-${featureTexts[idx]}`}
                className="flex items-center gap-3 font-bold text-sm uppercase tracking-[0.18em] rogym-sx-d684cd20"
              >
                <Icon size={15} color={GD} strokeWidth={2.5} />
                {featureTexts[idx]}
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
  const { t } = useTranslation('home')
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
            {t('programs.detail')}
          </span>
          <ArrowRight size={14} color={T} />
        </button>
      </div>
    </div>
  )
})

/* ── Training section ── */
const TrainingSection = memo(function TrainingSection() {
  const { t } = useTranslation('home')

  const trainingPrograms: TrainingCardProps[] = [
    {
      img: powerlift,
      tag: 'ELITE POWER',
      title: 'POWERLIFTING',
      desc: t('programs.powerliftingDesc'),
      width: 1080,
      height: 1920,
    },
    {
      img: hiit,
      tag: 'FAT BURNER',
      title: 'HIIT TRAINING',
      desc: t('programs.hiitDesc'),
      width: 1080,
      height: 1920,
    },
  ]

  const extraPrograms: [LucideIcon, string, string][] = [
    [Dumbbell, t('programs.strengthName'), t('programs.strengthDesc')],
    [Zap, t('programs.yogaName'), t('programs.yogaDesc')],
    [Trophy, t('programs.boxingName'), t('programs.boxingDesc')],
  ]

  return (
    <section className="w-full py-32 relative rogym-sx-d8b3875b">
      <div className="max-w-[1280px] mx-auto px-10">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4 rogym-sx-9cd1aaa6">
              {t('programs.sectionLabel')}
            </div>
            <h2 className="uppercase leading-none rogym-sx-37943c0d">
              {t('programs.heading1')}
              <br />
              {t('programs.heading2')}
            </h2>
          </div>
          <div className="h-1 w-32 rounded-full rogym-sx-c3c1e2cb" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
          {trainingPrograms.map((program) => (
            <TrainingCard key={program.title} {...program} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {extraPrograms.map(([Icon, name, desc]) => (
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
  const { t } = useTranslation('home')

  const coaches: CoachCardProps[] = [
    { img: pt1, name: 'PHAM YEN NHI', role: 'MASTER POWERLIFTER', bio: t('trainers.phamYenNhiBio'), width: 1179, height: 1470 },
    { img: pt2, name: 'TRINH VAN MINH', role: 'HIIT SPECIALIST', bio: t('trainers.trinhVanMinhBio'), width: 736, height: 1104 },
    { img: pt3, name: 'LE THANH AN', role: 'STRENGTH COACH', bio: t('trainers.lethanhAnBio'), width: 634, height: 951 },
  ]

  return (
    <section className="w-full py-32 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none rogym-sx-bee9a30c" />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5 rogym-sx-339ac6c6">{t('trainers.sectionTitle')}</h2>
          <p className="uppercase font-semibold tracking-[0.15em] opacity-50 rogym-sx-8b36c264">
            {t('trainers.sectionSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {coaches.map((coach) => (
            <CoachCard key={coach.name} {...coach} />
          ))}
        </div>
        <div className="flex justify-center mt-16">
          <ButtonLink variant="outline-green-light" size="hero" to="/trainers">
            {t('trainers.cta', { defaultValue: 'Xem tất cả huấn luyện viên' })}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
})

/* ── Pricing ── */
const PricingCard = memo(function PricingCard({ plan }: { plan: Plan }) {
  const { hot } = plan
  const { t } = useTranslation('home')
  return (
    <div
      className={`rogym-pricing-card relative rounded-[40px] p-8 flex flex-col cursor-pointer h-full ${
        hot ? 'rogym-pricing-card--featured' : ''
      }`}
    >
      {hot && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest rogym-sx-15e311e3">
          {t('packages.popular')}
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
        <span>{t('packages.registerBtn')}</span>
      </button>
    </div>
  )
})

const PricingSection = memo(function PricingSection() {
  const { t } = useTranslation('home')

  const pricingPlans: Plan[] = [
    {
      tier: t('packages.basicTier'),
      price: '599K',
      unit: t('packages.perMonth'),
      features: [
        t('packages.basicFeature1'),
        t('packages.basicFeature2'),
        t('packages.basicFeature3'),
      ],
      hot: false,
    },
    {
      tier: t('packages.premiumTier'),
      price: '999K',
      unit: t('packages.perMonth'),
      features: [
        t('packages.premiumFeature1'),
        t('packages.premiumFeature2'),
        t('packages.premiumFeature3'),
        t('packages.premiumFeature4'),
        t('packages.premiumFeature5'),
      ],
      hot: true,
    },
    {
      tier: t('packages.eliteTier'),
      price: '1.9M',
      unit: t('packages.perMonth'),
      features: [
        t('packages.eliteFeature1'),
        t('packages.eliteFeature2'),
        t('packages.eliteFeature3'),
        t('packages.eliteFeature4'),
        t('packages.eliteFeature5'),
      ],
      hot: false,
    },
  ]

  return (
    <section className="w-full py-32 relative rogym-sx-7b5fda64">
      <div className="absolute inset-0 pointer-events-none rogym-sx-49e5c51a" />
      <div className="max-w-[1280px] mx-auto px-10 relative">
        <div className="text-center mb-20">
          <h2 className="uppercase leading-none mb-5 rogym-sx-37943c0d">{t('packages.sectionTitle')}</h2>
          <div className="h-1 w-24 rounded-full mx-auto rogym-sx-c3c1e2cb" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-8">
          {pricingPlans.map((p) => (
            <PricingCard key={p.tier} plan={p} />
          ))}
        </div>
        <p className="text-center mt-12 rogym-sx-0ac692a1">
          {t('packages.disclaimer')}
        </p>
      </div>
    </section>
  )
})

/* ── CTA Banner ── */
const CTABanner = memo(function CTABanner() {
  const { t } = useTranslation('home')
  return (
    <section className="w-full py-28 relative overflow-hidden rogym-sx-3645accf">
      <div className="absolute inset-0 pointer-events-none rogym-sx-4c20acf6" />
      <div className="max-w-[1280px] mx-auto px-10 text-center relative">
        <p className="uppercase font-bold tracking-[0.28em] mb-4 rogym-sx-4c894103">
          {t('cta.eyebrow')}
        </p>
        <h2 className="uppercase leading-none mb-8 rogym-sx-1297467b">
          {t('cta.heading1')}
          <br />
          <span className="rogym-sx-f27dac31">{t('cta.heading2')}</span>
        </h2>
        <p className="max-w-md mx-auto mb-10 rogym-sx-31cf2166">
          {t('cta.body')}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <ButtonLink variant="primary" size="hero" to="/login">{t('cta.ctaFree')}</ButtonLink>
          <ButtonLink variant="outline-white" size="hero" to="/contact">{t('cta.ctaContact')}</ButtonLink>
        </div>
      </div>
    </section>
  )
})

/* ── Footer ── */
const Footer = memo(function Footer() {
  const { t } = useTranslation('home')

  const footerColumns = [
    {
      category: t('footer.colPrograms'),
      links: FOOTER_PROGRAM_LINKS,
    },
    {
      category: t('footer.colInfo'),
      links: [
        t('footer.aboutUs'),
        t('footer.trainingPrograms'),
        t('footer.trainerTeam'),
        t('footer.membership'),
        t('footer.contact'),
      ],
    },
    {
      category: t('footer.colSupport'),
      links: [t('footer.faq'), t('footer.contact'), t('footer.policy'), t('footer.terms')],
    },
  ]

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
              {t('footer.tagline')}
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
          {footerColumns.map(({ category, links }) => (
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
          <span className="rogym-sx-f419f934">{t('footer.copyright')}</span>
          <span className="rogym-sx-f419f934">{t('footer.address')}</span>
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
