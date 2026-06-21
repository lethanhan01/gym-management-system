import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomeNavbar from '@/components/home/HomeNavbar'

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
      t: 'YOGA & LINH HOẠT',
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
            <span>{t('programs.registerBtn')}</span>
          </Link>
          <Link to="/contact" className="rogym-btn rogym-btn--hero rogym-btn--outline-white">
            <span>{t('programs.contactBtn')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
