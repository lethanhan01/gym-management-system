import { useTranslation } from 'react-i18next'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  Card,
  CardTitle,
  CardDescription,
  Badge,
  ButtonLink,
} from '@/components/ui'

export default function TrainersPage() {
  const { t } = useTranslation('home')

  const trainers = [
    {
      n: 'PHẠM YẾN NHI',
      r: 'MASTER POWERLIFTER',
      b: t('trainers.phamYenNhiBio'),
    },
    {
      n: 'TRỊNH VĂN MINH',
      r: 'HIIT SPECIALIST',
      b: t('trainers.trinhVanMinhBio'),
    },
    {
      n: 'LÊ THÀNH AN',
      r: 'STRENGTH COACH',
      b: t('trainers.lethanhAnBio'),
    },
  ]

  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            {t('trainers.pageTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t('trainers.pageSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trainers.map((c) => (
            <Card
              key={c.n}
              variant="glass"
              padding="lg"
              className="rounded-[40px] border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--rogym-teal)]/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex flex-col justify-start"
            >
              <CardTitle size="lg" className="font-bold text-white tracking-wide">
                {c.n}
              </CardTitle>
              <div className="mt-2.5">
                <Badge tone="accent" size="sm" className="font-bold tracking-widest uppercase">
                  {c.r}
                </Badge>
              </div>
              <CardDescription className="mt-4 text-white/70 leading-relaxed text-sm">
                {c.b}
              </CardDescription>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex gap-4 flex-wrap">
          <ButtonLink
            to="/member/choose-trainer"
            variant="primary"
            size="hero"
          >
            {t('trainers.chooseBtn')}
          </ButtonLink>
          <ButtonLink
            to="/contact"
            variant="outline-white"
            size="hero"
          >
            {t('trainers.contactBtn')}
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

