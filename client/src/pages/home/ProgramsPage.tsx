import { useTranslation } from 'react-i18next'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  Card,
  CardTitle,
  CardDescription,
  Badge,
  ButtonLink,
} from '@/components/ui'

export default function ProgramsPage() {
  const { t } = useTranslation('home')

  const programs = [
    {
      t: 'POWERLIFTING',
      d: t('programs.powerliftingSubtitle'),
    },
    {
      t: 'HIIT TRAINING',
      d: t('programs.hiitSubtitle'),
    },
    {
      t: t('programs.yogaName'),
      d: t('programs.yogaSubtitle'),
    },
  ]

  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            {t('programs.pageTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t('programs.pageSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programs.map((x) => (
            <Card
              key={x.t}
              variant="glass"
              padding="lg"
              className="rounded-[40px] border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--rogym-teal)]/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex flex-col justify-start"
            >
              <div className="mb-3">
                <Badge tone="accent" size="sm" className="font-bold tracking-widest uppercase">
                  {x.t}
                </Badge>
              </div>
              <CardTitle size="md" className="mt-1 font-bold text-white text-lg sm:text-xl">
                {x.d.split('—')[0]}
              </CardTitle>
              <CardDescription className="mt-2.5 text-white/70 leading-relaxed">
                {x.d}
              </CardDescription>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex gap-4 flex-wrap">
          <ButtonLink
            to="/member/register"
            variant="primary"
            size="hero"
          >
            {t('programs.registerBtn')}
          </ButtonLink>
          <ButtonLink
            to="/contact"
            variant="outline-white"
            size="hero"
          >
            {t('programs.contactBtn')}
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

