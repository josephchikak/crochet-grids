import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Crochet Grids keeps uploaded images and crochet projects on your device.'
}

export default function PrivacyPage () {
  return (
    <div className='min-h-screen bg-cotton text-ink'>
      <SiteHeader />
      <main className='mx-auto max-w-4xl px-5 py-12 sm:px-10 sm:py-18'>
        <p className='font-mono text-xs uppercase tracking-[0.16em] text-ink-muted'>Privacy, in plain language</p>
        <h1 className='mt-4 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl'>Your chart stays yours.</h1>
        <p className='mt-6 max-w-2xl text-lg leading-8 text-ink-muted'>Crochet Grids is designed to work in your browser without uploading your image or project to us.</p>

        <div className='mt-12 grid gap-9 border-t border-grid pt-9 leading-7'>
          <PolicySection title='Images and projects'>
            Uploaded JPG, PNG and WebP files are processed on your device. The prepared image, stitch grid, palette and row progress are saved in this browser using IndexedDB. We do not receive them.
          </PolicySection>
          <PolicySection title='Exports'>
            PNG and PDF exports are generated on your device and downloaded directly to you. They are not copied to a Crochet Grids server.
          </PolicySection>
          <PolicySection title='Analytics'>
            Optional Vercel Analytics is loaded only after you accept it. Your choice is saved in local browser storage under <code className='font-mono text-sm'>crochet-grids-analytics</code>. Analytics is separate from essential project saving.
          </PolicySection>
          <PolicySection title='Clearing your data'>
            Deleting a saved chart removes it from this browser. Clearing this site&apos;s browser data can remove every saved chart and your analytics choice, so export important work first.
          </PolicySection>
          <PolicySection title='Contact'>
            Questions can be sent to <a className='text-link' href='mailto:raytheboffin@gmail.com'>raytheboffin@gmail.com</a>. Crochet Grids is operated from Abuja, Federal Capital Territory, Nigeria.
          </PolicySection>
        </div>

        <div className='mt-12 flex flex-wrap gap-4'>
          <Link className='primary-action' href='/create'>Create a pattern</Link>
          <Link className='text-link self-center' href='/terms'>Read the terms</Link>
        </div>
      </main>
    </div>
  )
}

function PolicySection ({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className='grid gap-3 sm:grid-cols-[12rem_1fr]'>
      <h2 className='text-xl font-semibold tracking-[-0.025em]'>{title}</h2>
      <p className='max-w-2xl text-ink-muted'>{children}</p>
    </section>
  )
}
