const fallbackSiteUrl = 'https://crochet-grids.vercel.app'

export function getSiteUrl () {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return new URL(fallbackSiteUrl)
    return url
  } catch {
    return new URL(fallbackSiteUrl)
  }
}
