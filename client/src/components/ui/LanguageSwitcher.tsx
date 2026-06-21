import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const isVi = i18n.language === 'vi'

  const toggle = () => {
    const next = isVi ? 'ja' : 'vi'
    i18n.changeLanguage(next)
    document.documentElement.lang = next
    localStorage.setItem('gym-locale', next)
  }

  return (
    <button
      data-no-sweep
      onClick={toggle}
      className="rogym-lang-switcher"
      aria-label={isVi ? 'Switch to Japanese' : 'Switch to Vietnamese'}
    >
      <span className={isVi ? 'rogym-lang-switcher__active' : 'rogym-lang-switcher__inactive'}>
        VI
      </span>
      <span className="rogym-lang-switcher__sep">/</span>
      <span className={!isVi ? 'rogym-lang-switcher__active' : 'rogym-lang-switcher__inactive'}>
        JA
      </span>
    </button>
  )
}
