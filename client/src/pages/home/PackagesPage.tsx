import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomeNavbar from '@/components/home/HomeNavbar'

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
            <div
              key={p.tier}
              className={`rounded-[40px] border border-white/10 bg-white/5 p-8 ${p.hot ? 'ring-1 ring-[#42e09e]' : ''}`}
            >
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                {p.tier}
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold">{p.price}</div>
                <div className="text-white/60">{t('packages.perMonth')}</div>
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
                  <span>{t('packages.registerBtn')}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
