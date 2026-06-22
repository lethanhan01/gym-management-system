import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

function NavBtn({
  to,
  variant,
  children,
}: {
  to: string
  variant: 'green' | 'outline'
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={`rogym-btn rogym-btn--nav ${
        variant === 'green' ? 'rogym-btn--primary text-white' : 'rogym-btn--outline-white'
      }`}
    >
      <span>{children}</span>
    </Link>
  )
}

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
        <Link to="/" className="flex items-center gap-2.5 shrink-0 rogym-sx-bc605c49">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center rogym-sx-1c639e32">
            <Dumbbell size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <span className="rogym-sx-f6d7ded8">ROGYM</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rogym-text-link rogym-text-link--nav text-sm font-medium rogym-sx-f917938c"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <NavBtn to="/login" variant="green">
            {tHome('nav.login')}
          </NavBtn>
          <NavBtn to="/member/register" variant="outline">
            {tHome('nav.register')}
          </NavBtn>
        </div>

        <button
          type="button"
          className="rogym-btn rogym-btn--icon rogym-btn--elevated md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label={open ? tCommon('nav.closeMenu') : tCommon('nav.openMenu')}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-10 pb-6 flex flex-col gap-4 rogym-sx-eb71f2b0">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rogym-text-link rogym-text-link--nav text-sm font-medium rogym-sx-f917938c"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 mt-2">
            <LanguageSwitcher />
            <NavBtn to="/login" variant="green">
              {tHome('nav.login')}
            </NavBtn>
            <NavBtn to="/member/register" variant="outline">
              {tHome('nav.register')}
            </NavBtn>
          </div>
        </div>
      )}
    </nav>
  )
}
