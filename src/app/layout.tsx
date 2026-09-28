import type { Metadata } from 'next'
import { Azeret_Mono, Figtree } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin']
})

const azeretMono = Azeret_Mono({
  variable: '--font-azeret-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Crochet Grids — Turn images into crochet charts',
  description: 'Convert a logo, graphic or photo into an editable single-crochet motif chart.'
}

export default function RootLayout ({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className='flex min-h-full flex-col'>{children}</body>
    </html>
  )
}
