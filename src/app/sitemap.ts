import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function sitemap (): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  return [
    { url: new URL('/', siteUrl).toString(), changeFrequency: 'monthly', priority: 1 },
    { url: new URL('/create', siteUrl).toString(), changeFrequency: 'monthly', priority: 0.9 },
    { url: new URL('/privacy', siteUrl).toString(), changeFrequency: 'yearly', priority: 0.3 },
    { url: new URL('/terms', siteUrl).toString(), changeFrequency: 'yearly', priority: 0.3 }
  ]
}
