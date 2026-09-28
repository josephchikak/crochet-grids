import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Thank you',
  description: 'Thank you for helping improve Crochet Grids.',
  robots: { index: false, follow: false }
}

export default function ThankYouPage () {
  return (
    <main className='grid min-h-screen place-items-center bg-sage px-5 py-12 text-ink'>
      <section className='w-full max-w-2xl border border-ink bg-cotton p-7 shadow-[9px_9px_0_var(--ink)] sm:p-12'>
        <p className='font-mono text-xs uppercase tracking-[0.16em] text-ink-muted'>Thank you</p>
        <h1 className='mt-4 text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl'>Your feedback shapes the next row.</h1>
        <p className='mt-6 max-w-xl text-lg leading-8 text-ink-muted'>Crochet Grids is being built with crochet artists, so practical notes about charts, colour changes and phone use are especially useful.</p>
        <div className='mt-8 flex flex-wrap gap-4'>
          <a className='primary-action' href='mailto:raytheboffin@gmail.com?subject=Crochet%20Grids%20feedback'>
            <Mail aria-hidden='true' size={18} /> Email feedback
          </a>
          <Link className='inline-flex min-h-11 items-center gap-2 font-semibold' href='/create'>
            <ArrowLeft aria-hidden='true' size={18} /> Back to chart maker
          </Link>
        </div>
        <Link className='mt-8 inline-block text-link text-sm' href='/'>Return home</Link>
      </section>
    </main>
  )
}
