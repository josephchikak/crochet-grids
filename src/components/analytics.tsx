'use client'

import { Analytics as VercelAnalytics } from '@vercel/analytics/react'

export function Analytics ({ isAccepted }: { isAccepted: boolean }) {
  if (!isAccepted) return null

  return (
    <div className='contents' data-analytics-consent='accepted'>
      <VercelAnalytics />
    </div>
  )
}
