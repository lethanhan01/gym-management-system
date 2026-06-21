import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomeNavbar from '@/components/home/HomeNavbar'

export default function ContactPage() {
  const { t } = useTranslation('home')

  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">{t('contact.pageTitle')}</h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t('contact.pageSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8">
            <form className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="text-sm font-semibold text-white/70">
                  {t('contact.name')}
                </label>
                <input
                  id="contact-name"
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="text-sm font-semibold text-white/70">
                  {t('contact.phone')}
                </label>
                <input
                  id="contact-phone"
                  className="mt-2 w-full rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="text-sm font-semibold text-white/70">
                  {t('contact.message')}
                </label>
                <textarea
                  id="contact-message"
                  className="mt-2 w-full min-h-32 rounded-2xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
                />
              </div>
              <button type="button" className="rogym-btn rogym-btn--primary rogym-btn--hero w-full">
                <span>{t('contact.submitBtn')}</span>
              </button>
              <div className="text-xs text-white/50">
                {t('contact.demoNote')}
              </div>
            </form>
          </div>

          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8">
            <div className="text-sm font-bold uppercase tracking-widest text-[#42e09e]">
              {t('contact.sectionTitle')}
            </div>
            <div className="mt-4 space-y-4 text-white/70">
              <div>
                <div className="font-semibold text-white">{t('contact.address')}</div>
                <div>{t('contact.addressValue')}</div>
              </div>
              <div>
                <div className="font-semibold text-white">{t('contact.hotline')}</div>
                <div>(+84) 865 797 312</div>
              </div>
              <div>
                <div className="font-semibold text-white">{t('contact.email')}</div>
                <div>An.LT235631@sis.hust.edu.vn</div>
              </div>
              <div>
                <div className="font-semibold text-white">{t('contact.hours')}</div>
                <div>{t('contact.hoursValue')}</div>
              </div>
            </div>
            <div className="mt-10">
              <Link
                to="/member/register"
                className="rogym-btn rogym-btn--wide rogym-btn--outline-white w-full"
              >
                <span>{t('contact.registerBtn')}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
