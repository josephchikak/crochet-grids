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
        <a className='text-link text-sm' href='#how-it-works'>
          How it works
        </a>
      </div>
    </header>
  )
}
