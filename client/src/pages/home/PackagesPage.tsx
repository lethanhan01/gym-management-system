import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import { Card, Badge, ButtonLink } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function PackagesPage() {
  const { t } = useTranslation('home')

  const packages = [
    {
      tier: t('packages.basicTier'),
      price: '599K',
      hot: false,
      f: [
        t('packages.pageBasicFeature1'),
        t('packages.pageBasicFeature2'),
        t('packages.pageBasicFeature3'),
      ],
    },
    {
      tier: t('packages.premiumTier'),
      price: '999K',
      hot: true,
      f: [
        t('packages.pagePremiumFeature1'),
        t('packages.pagePremiumFeature2'),
        t('packages.pagePremiumFeature3'),
      ],
    },
    {
      tier: t('packages.eliteTier'),
      price: '1.9M',
      hot: false,
      f: [
        t('packages.pageEliteFeature1'),
        t('packages.pageEliteFeature2'),
        t('packages.pageEliteFeature3'),
      ],
    },
  ]

  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            {t('packages.pageTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t('packages.pageSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((p) => (
            <Card
              key={p.tier}
              variant="glass"
              padding="lg"
              className={cn(
                'rounded-[40px] border border-white/10 bg-white/5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
                p.hot && 'border-[var(--rogym-teal)] ring-1 ring-[var(--rogym-teal)]/40 bg-[var(--rogym-teal)]/[0.04]'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    tone={p.hot ? 'accent' : 'muted'}
                    size="sm"
                    className="tracking-[0.2em] uppercase font-bold"
                  >
                    {p.tier}
                  </Badge>
                  {p.hot && (
                    <Badge tone="primary" size="xs" className="tracking-wider uppercase">
                      {t('packages.popular', { defaultValue: 'PHỔ BIẾN' })}
                    </Badge>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{p.price}</span>
                  <span className="text-sm text-white/60 font-medium">{t('packages.perMonth')}</span>
                </div>

                <div className="mt-8 space-y-3.5">
                  {p.f.map((x) => (
                    <div key={x} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[var(--rogym-teal)]/15 border border-[var(--rogym-teal)]/40 flex items-center justify-center shrink-0 mt-0.5 text-[var(--rogym-teal)]">
                        <Check size={12} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm text-white/75 leading-relaxed">{x}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10">
                <ButtonLink
                  to="/member/subscription/setup"
                  variant={p.hot ? 'dark' : 'outline-white'}
                  size="wide"
                  fullWidth
                >
                  {t('packages.registerBtn')}
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

