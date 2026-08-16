import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Send, MapPin, Phone, Mail, Clock } from 'lucide-react'
import HomeNavbar from '@/components/home/HomeNavbar'
import {
  Card,
  FormField,
  Input,
  Textarea,
  Button,
  ButtonLink,
  Badge,
} from '@/components/ui'

export default function ContactPage() {
  const { t } = useTranslation('home')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
      setName('')
      setPhone('')
      setMessage('')
    }, 600)
  }

  return (
    <div className="rogym-page">
      <HomeNavbar />
      <div className="max-w-[1280px] mx-auto px-10 py-28">
        <div className="mb-10">
          <h1 className="uppercase rogym-sx-37943c0d text-3xl md:text-4xl font-bold">
            {t('contact.pageTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            {t('contact.pageSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            variant="glass"
            padding="lg"
            className="rounded-[40px] border border-white/10 bg-white/5"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField label={t('contact.name')} htmlFor="contact-name" required>
                <Input
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('contact.namePlaceholder', { defaultValue: 'Nguyễn Văn A' })}
                  required
                />
              </FormField>

              <FormField label={t('contact.phone')} htmlFor="contact-phone" required>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('contact.phonePlaceholder', { defaultValue: '0987 654 321' })}
                  required
                />
              </FormField>

              <FormField label={t('contact.message')} htmlFor="contact-message" required>
                <Textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('contact.messagePlaceholder', { defaultValue: 'Để lại câu hỏi hoặc yêu cầu tư vấn...' })}
                  rows={4}
                  required
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="hero"
                fullWidth
                loading={loading}
                leftIcon={<Send size={18} />}
              >
                {t('contact.submitBtn')}
              </Button>

              {submitted && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-[var(--rogym-teal)]/15 border border-[var(--rogym-teal)]/30 text-[var(--rogym-teal)] text-sm font-medium animate-in fade-in duration-200">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>
                    {t('contact.successMsg', {
                      defaultValue: 'Cảm ơn bạn! Yêu cầu liên hệ đã được gửi thành công.',
                    })}
                  </span>
                </div>
              )}

              <div className="text-xs text-white/50">
                {t('contact.demoNote')}
              </div>
            </form>
          </Card>

          <Card
            variant="glass"
            padding="lg"
            className="rounded-[40px] border border-white/10 bg-white/5 flex flex-col justify-between"
          >
            <div>
              <Badge tone="accent" size="sm" className="mb-4 tracking-widest uppercase font-bold">
                {t('contact.sectionTitle')}
              </Badge>

              <div className="space-y-5 text-white/70">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[var(--rogym-teal)]">
                    <MapPin size={17} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t('contact.address')}</div>
                    <div className="text-sm mt-0.5">{t('contact.addressValue')}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[var(--rogym-teal)]">
                    <Phone size={17} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t('contact.hotline')}</div>
                    <div className="text-sm mt-0.5">(+84) 865 797 312</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[var(--rogym-teal)]">
                    <Mail size={17} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t('contact.email')}</div>
                    <div className="text-sm mt-0.5">An.LT235631@sis.hust.edu.vn</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-[var(--rogym-teal)]">
                    <Clock size={17} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{t('contact.hours')}</div>
                    <div className="text-sm mt-0.5">{t('contact.hoursValue')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <ButtonLink
                to="/member/register"
                variant="outline-white"
                size="wide"
                fullWidth
              >
                {t('contact.registerBtn')}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

