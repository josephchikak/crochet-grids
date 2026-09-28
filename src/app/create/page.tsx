import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreateProjectScreen } from '@/features/pattern/setup/create-project-screen'

export const metadata: Metadata = {
  title: 'Create a crochet chart',
  description: 'Prepare an image and turn it into an editable flat single-crochet motif.'
}

export default function CreatePage () {
  return (
    <main className='min-h-screen bg-cotton px-4 py-6 text-ink sm:px-8 lg:px-12'>
      <div className='mx-auto max-w-[1280px]'>
        <Link className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold' href='/'>
          <ArrowLeft aria-hidden='true' size={17} /> Back home
        </Link>
        <div className='my-8 max-w-3xl sm:my-12'>
          <h1 className='text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-7xl'>Build your crochet chart</h1>
          <p className='mt-5 max-w-2xl text-lg leading-8 text-ink-muted'>Start with the stitch count you want to crochet. You can correct individual cells after the chart is generated.</p>
        </div>
        <CreateProjectScreen />
      </div>
    </main>
  )
}
