import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms for using Crochet Grids to create single-crochet motif charts.'
}

export default function TermsPage () {
  return (
    <div className='min-h-screen bg-cotton text-ink'>
      <SiteHeader />
      <main className='mx-auto max-w-4xl px-5 py-12 sm:px-10 sm:py-18'>
        <p className='font-mono text-xs uppercase tracking-[0.16em] text-ink-muted'>Terms of use</p>
        <h1 className='mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl'>A chart is a starting point.</h1>
        <p className='mt-6 max-w-2xl text-lg leading-8 text-ink-muted'>These terms keep the tool useful and the responsibilities clear.</p>

        <div className='mt-12 grid gap-9 border-t border-grid pt-9 leading-7'>
          <Term number='01' title='Your images'>
            Only use images you own or have permission to adapt. You keep responsibility for the images you choose and the charts and exports you create.
          </Term>
          <Term number='02' title='Check before crocheting'>
            Image conversion is an aid, not a guarantee. Review stitch counts, colour changes, orientation and written rows before committing yarn or selling a finished piece.
          </Term>
          <Term number='03' title='On-device storage'>
            Projects are stored in your browser and can disappear if browser data is cleared, storage is blocked or the device is lost. Keep PNG or PDF exports of work you cannot replace.
          </Term>
          <Term number='04' title='Availability'>
            Crochet Grids is provided as available without warranties of uninterrupted service or fitness for a specific garment, construction method or commercial use.
          </Term>
          <Term number='05' title='Contact'>
            Questions can be sent to <a className='text-link' href='mailto:raytheboffin@gmail.com'>raytheboffin@gmail.com</a>. Crochet Grids is operated from Abuja, Federal Capital Territory, Nigeria.
          </Term>
        </div>

        <div className='mt-12 flex flex-wrap gap-4'>
          <Link className='primary-action' href='/create'>Create a pattern</Link>
          <Link className='text-link self-center' href='/privacy'>Read the privacy policy</Link>
        </div>
      </main>
    </div>
  )
}

function Term ({ number, title, children }: { number: string, title: string, children: React.ReactNode }) {
  return (
    <section className='grid gap-3 sm:grid-cols-[3rem_12rem_1fr]'>
      <span className='font-mono text-xs text-ink-muted'>{number}</span>
      <h2 className='text-xl font-semibold tracking-[-0.025em]'>{title}</h2>
      <p className='max-w-2xl text-ink-muted'>{children}</p>
    </section>
  )
}
