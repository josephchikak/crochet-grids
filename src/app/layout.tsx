import { Azeret_Mono, Figtree } from 'next/font/google'
import type { ReactNode } from 'react'
import { ConsentManager } from '@/components/consent-banner'
import { siteMetadata } from '@/lib/metadata'
import './globals.css'

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin']
})

const azeretMono = Azeret_Mono({
  variable: '--font-azeret-mono',
  subsets: ['latin']
})

export const metadata = siteMetadata

export default function RootLayout ({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${azeretMono.variable} h-full antialiased`}
    >
      <body className='flex min-h-full flex-col'>
        {children}
        <ConsentManager />
      </body>
    </html>
  )
}
