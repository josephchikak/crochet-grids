import Link from 'next/link'
import { ArrowUpRight, Check, ImagePlus, PencilLine } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { RecentProjects } from '@/features/pattern/persistence/recent-projects'

export default function Home () {
  return (
    <div className='min-h-screen overflow-hidden bg-cotton text-ink'>
      <SiteHeader />

      <main>
        <section className='mx-auto grid min-h-[calc(100svh-72px)] max-w-[1440px] grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='flex flex-col justify-between border-b border-grid px-5 py-10 sm:px-10 sm:py-14 lg:border-r lg:border-b-0 lg:px-14 lg:py-16'>
            <div className='max-w-[680px]'>
              <p className='mb-8 max-w-sm text-sm leading-6 text-ink-muted'>
                A private, on-device chart maker for flat single-crochet motifs.
              </p>
              <h1 className='max-w-[12ch] text-[clamp(3.2rem,8vw,7.6rem)] font-semibold leading-[0.86] tracking-[-0.07em]'>
                Turn any image into a crochet-ready chart
              </h1>
              <p className='mt-8 max-w-xl text-lg leading-8 text-ink-muted sm:text-xl'>
                Convert a logo, graphic or photo into an editable motif with clear rows,
                yarn colours and print-ready instructions.
              </p>
              <div className='mt-9 flex flex-wrap items-center gap-4'>
                <Link className='primary-action' href='/create'>
                  Create a pattern
                  <ArrowUpRight aria-hidden='true' size={18} strokeWidth={2.25} />
                </Link>
                <a className='text-link' href='#how-it-works'>
                  See how it works
                </a>
              </div>
            </div>

            <div className='mt-16 grid grid-cols-3 gap-3 border-t border-grid pt-5 text-xs text-ink-muted sm:max-w-lg sm:text-sm'>
              <span>Images stay private</span>
              <span>Built for phones</span>
              <span>PDF + PNG export</span>
            </div>
          </div>

          <MotifPreview />
        </section>

        <RecentProjects />

        <section id='how-it-works' className='border-y border-grid bg-ink text-cotton'>
          <div className='mx-auto grid max-w-[1440px] md:grid-cols-3'>
            {steps.map((step) => (
              <article className='border-grid-dark p-7 md:border-r md:p-10 last:md:border-r-0' key={step.title}>
                <step.icon aria-hidden='true' className='mb-12 text-sage' size={25} strokeWidth={1.8} />
                <h2 className='text-2xl font-semibold tracking-[-0.035em]'>{step.title}</h2>
                <p className='mt-3 max-w-sm leading-7 text-cotton-muted'>{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Link
        aria-label='Start a new pattern'
        className='fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex min-h-12 items-center gap-2 border border-ink bg-indigo px-5 font-semibold text-white shadow-[4px_4px_0_var(--ink)] sm:hidden'
        href='/create'
      >
        Start making
        <ArrowUpRight aria-hidden='true' size={17} />
      </Link>
    </div>
  )
}

function MotifPreview () {
  return (
    <div className='relative flex min-h-[580px] items-center justify-center bg-sage px-5 py-14 sm:px-10 lg:min-h-full'>
      <div aria-hidden='true' className='absolute inset-0 grid-surface opacity-30' />
      <div className='relative w-full max-w-[650px] border border-ink bg-cotton p-3 shadow-[9px_9px_0_var(--ink)] sm:p-5'>
        <div className='mb-4 flex items-center justify-between border-b border-grid pb-3 font-mono text-[11px] text-ink-muted sm:text-xs'>
          <span>60 stitches × 48 rows</span>
          <span>4 yarn colours</span>
        </div>
        <div className='motif-grid border-t border-l border-grid-strong'>
          {motifCells.map((color, index) => (
            <span className={`motif-cell ${color}`} key={index} />
          ))}
        </div>
        <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-2 font-mono text-[11px] sm:text-xs'>
            <span className='size-3 bg-indigo' /> Indigo
            <span className='ml-2 size-3 bg-poppy' /> Poppy
            <span className='ml-2 size-3 bg-ink' /> Ink
          </div>
          <span className='flex items-center gap-1.5 text-xs font-semibold'>
            <Check aria-hidden='true' size={15} /> Ready to crochet
          </span>
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    title: 'Prepare the image',
    description: 'Crop it, choose the stitch dimensions and limit the number of yarn colours.',
    icon: ImagePlus
  },
  {
    title: 'Refine every stitch',
    description: 'Paint cells, merge colours and clean up details that will not translate into yarn.',
    icon: PencilLine
  },
  {
    title: 'Follow row by row',
    description: 'Read the correct direction on-screen or print a numbered PDF with written colour runs.',
    icon: Check
  }
]

const motif = [
  '000000000000',
  '000011110000',
  '000122221000',
  '001223322100',
  '012233332210',
  '012333333210',
  '012330033210',
  '012330033210',
  '001223322100',
  '000122221000',
  '000011110000',
  '000000000000'
]

const motifColors = ['bg-cotton', 'bg-indigo', 'bg-poppy', 'bg-ink']
const motifCells = motif.flatMap((row) => [...row].map((value) => motifColors[Number(value)]))
