import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink, LanguageSwitcher } from '@/components/ui'
import roGymLogo from '@/assets/rogym_logo.svg'

export default function HomeNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { t: tHome } = useTranslation('home')
  const { t: tCommon } = useTranslation('common')

  const navLinks = [
    { label: tHome('nav.home'), to: '/' },
    { label: tHome('nav.programs'), to: '/programs' },
    { label: tHome('nav.trainers'), to: '/trainers' },
    { label: tHome('nav.packages'), to: '/packages' },
    { label: tHome('nav.contact'), to: '/contact' },
  ]

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`rogym-navbar ${scrolled ? 'rogym-navbar--scrolled' : ''}`}>
      <div className="rogym-container h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={roGymLogo} alt="ROGYM" className="w-11 h-11 object-contain" />
          <span className="font-['Anton'] text-2xl tracking-wider text-white">ROGYM</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rogym-text-link rogym-text-link--nav text-sm font-medium"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <ButtonLink to="/login" variant="primary" size="nav">
            {tHome('nav.login')}
          </ButtonLink>
          <ButtonLink to="/member/register" variant="outline-white" size="nav">
            {tHome('nav.register')}
          </ButtonLink>
        </div>

        <Button
          variant="icon"
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label={open ? tCommon('nav.closeMenu') : tCommon('nav.openMenu')}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </Button>
      </div>

      {open && (
        <div className="md:hidden px-10 pb-6 flex flex-col gap-1 border-b border-white/10 bg-[var(--rogym-bg-glass)] backdrop-blur-xl">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rogym-text-link rogym-text-link--nav text-sm font-medium py-3"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <LanguageSwitcher />
            <ButtonLink to="/login" variant="primary" size="nav" className="flex-1">
              {tHome('nav.login')}
            </ButtonLink>
            <ButtonLink to="/member/register" variant="outline-white" size="nav" className="flex-1">
              {tHome('nav.register')}
            </ButtonLink>
          </div>
        </div>
      )}
    </nav>
  )
}
