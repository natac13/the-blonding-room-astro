import {
  animated,
  config as rsConfig,
  useSpring,
  useTrail,
} from '@react-spring/web'
import React from 'react'
import { cn } from '../utils/misc'
import { useMediaQuery } from 'usehooks-ts'
import { ChevronsDown } from 'lucide-react'

const links = [
  {
    text: 'Hair Services',
    href: '/#hair-services',
  },
  {
    text: 'Nail Services',
    href: '/#nail-services',
  },
  {
    text: 'About',
    href: '/#about',
  },
  {
    text: 'Contact Us!',
    href: '/#contact-us',
  },
]

export function Navbar() {
  const [reveal, setReveal] = React.useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const linkTrail = useTrail(links?.length, {
    transform: `translate${isMobile ? 'X' : 'Y'}(${reveal ? '0px' : '-20px'})`,
    opacity: reveal ? 1 : 0,
    delay: isMobile ? 150 : 50,
  })

  const navSpring = useSpring({
    height: reveal ? (isMobile ? '160px' : '60px') : '0px',
    config: rsConfig.slow,
  })

  const titleSpring = useSpring({
    opacity: reveal ? 1 : 0,
    config: rsConfig.default,
  })
  return (
    <div className="fixed left-0 right-0 top-0 z-50 w-full bg-black px-4 py-2 font-sans">
      <div className="absolute bottom-0 left-1/2 right-1/2 grid h-20 w-full -translate-x-1/2 transform place-items-center">
        <div className="absolute left-1/2 right-1/2 top-full h-[36px] w-[36px] -translate-x-1/2 transform border-x-[36px] border-b-0 border-t-[36px] border-solid border-x-transparent border-t-black"></div>
        <button
          className="absolute -bottom-7 z-auto text-white"
          onClick={() => {
            setReveal((state) => !state)
          }}
        >
          <span className="sr-only">Open Navigation</span>
          <ChevronsDown className="text-primary-50" size={25} />
        </button>
      </div>
      <animated.div
        style={navSpring}
        className={cn(
          'flex flex-col items-center justify-center overflow-hidden ',
        )}
      >
        <animated.div style={titleSpring}>
          <h3 className="text-sm text-primary-50">The Blonding Room</h3>
        </animated.div>
        <nav
          className={cn(
            'flex h-full  w-full flex-1 flex-col justify-center md:flex-auto md:flex-row',
          )}
        >
          {linkTrail.map((styles, idx) => (
            <animated.a
              style={styles}
              key={links[idx]?.text}
              href={links[idx].href}
              className="font-xl flex flex-1 items-center justify-center font-light uppercase tracking-wide text-primary-200 hover:text-primary-300 hover:underline focus:text-primary-400 focus:underline focus:outline-none"
            >
              {links[idx].text}
            </animated.a>
          ))}
        </nav>
      </animated.div>
    </div>
  )
}
