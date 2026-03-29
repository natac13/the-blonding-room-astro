import React from 'react'
import { cn } from '../utils/misc'

const links = [
  { text: 'Hair Services', href: '/#hair-services' },
  { text: 'About', href: '/#about' },
  { text: 'Contact Us', href: '/#contact-us' },
]

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 right-0 left-0 z-50 transition-all duration-500',
        scrolled ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a
          href="/"
          className="font-cursive text-xl tracking-wide text-white lg:text-2xl"
        >
          The Blonding Room
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <li key={link.text}>
              <a
                href={link.href}
                className="hover:text-primary-400 text-[13px] font-light tracking-[0.2em] text-white/80 uppercase transition-colors duration-300"
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile menu button */}
        <button
          className="flex flex-col gap-[5px] md:hidden"
          onClick={() => setMenuOpen((s) => !s)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span
            className={cn(
              'block h-px w-6 bg-white transition-all duration-300',
              menuOpen && 'translate-y-[6px] rotate-45',
            )}
          />
          <span
            className={cn(
              'block h-px w-6 bg-white transition-all duration-300',
              menuOpen && 'opacity-0',
            )}
          />
          <span
            className={cn(
              'block h-px w-6 bg-white transition-all duration-300',
              menuOpen && '-translate-y-[6px] -rotate-45',
            )}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-500 md:hidden',
          menuOpen ? 'max-h-60 bg-black/95 backdrop-blur-md' : 'max-h-0',
        )}
      >
        <ul className="flex flex-col items-center gap-6 px-6 pt-2 pb-8">
          {links.map((link) => (
            <li key={link.text}>
              <a
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="hover:text-primary-400 text-sm font-light tracking-[0.2em] text-white/80 uppercase transition-colors duration-300"
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
