import Link from 'next/link'

export function SiteHeader () {
  return (
    <header className='relative z-10 border-b border-grid bg-cotton'>
      <div className='mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-14'>
        <Link className='flex items-center gap-3 font-semibold tracking-[-0.03em]' href='/'>
          <span aria-hidden='true' className='brand-mark'>
            <i />
            <i />
            <i />
            <i />
          </span>
          Crochet Grids
        </Link>
        <nav aria-label='Main navigation' className='flex items-center gap-4 text-sm'>
          <Link className='text-link hidden sm:inline' href='/privacy'>Privacy</Link>
          <Link className='text-link hidden md:inline' href='/terms'>Terms</Link>
          <Link className='text-link' href='/#how-it-works'>How it works</Link>
        </nav>
      </div>
    </header>
  )
}
