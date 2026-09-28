import type { Metadata } from 'next'
import { getSiteUrl } from './site'

export const siteMetadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'Crochet Grids — Image to crochet chart maker',
    template: '%s — Crochet Grids'
  },
  description: 'Convert a logo, graphic or photo into an editable single-crochet motif chart with private on-device tools.',
  applicationName: 'Crochet Grids',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Crochet Grids',
    title: 'Crochet Grids — Image to crochet chart maker',
    description: 'Turn an image into an editable, printable single-crochet motif chart.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'A colourful crochet motif chart on a warm paper background' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crochet Grids — Image to crochet chart maker',
    description: 'Turn an image into an editable, printable single-crochet motif chart.',
    images: ['/opengraph-image']
  }
}
