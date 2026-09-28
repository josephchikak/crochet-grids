import Link from 'next/link'
import { ArrowLeft, Grid2X2Plus } from 'lucide-react'

export default function NotFound () {
  return (
    <main className='grid min-h-screen place-items-center bg-cotton px-5 py-12 text-ink'>
      <section className='relative w-full max-w-3xl overflow-hidden border border-ink bg-sage p-7 shadow-[9px_9px_0_var(--ink)] sm:p-12'>
        <div aria-hidden='true' className='absolute inset-0 grid-surface opacity-20' />
        <div className='relative max-w-xl bg-cotton p-6 sm:p-9'>
          <p className='font-mono text-sm text-ink-muted'>404 · missed stitch</p>
          <h1 className='mt-4 text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-7xl'>This page slipped off the hook.</h1>
          <p className='mt-5 leading-7 text-ink-muted'>The chart or page may have moved. Saved projects only exist in the browser where they were created.</p>
          <div className='mt-8 flex flex-wrap gap-4'>
            <Link className='primary-action' href='/create'><Grid2X2Plus aria-hidden='true' size={18} /> Create a pattern</Link>
            <Link className='inline-flex min-h-11 items-center gap-2 font-semibold' href='/'><ArrowLeft aria-hidden='true' size={18} /> Home</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
