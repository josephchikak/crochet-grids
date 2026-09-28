'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { Analytics } from './analytics'

export const consentStorageKey = 'crochet-grids-analytics'
type Consent = 'accepted' | 'declined'
const consentEvent = 'crochet-grids:analytics-consent'

export function ConsentManager () {
  const consent = useSyncExternalStore(subscribeToConsent, readConsent, getServerConsent)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const isOpen = consent === null || isSettingsOpen

  const choose = useCallback((choice: Consent) => {
    try {
      localStorage.setItem(consentStorageKey, choice)
    } catch {
      // The choice still applies for this tab when browser storage is blocked
    }
    window.dispatchEvent(new Event(consentEvent))
    setIsSettingsOpen(false)
  }, [])

  if (consent === undefined) return null

  return (
    <>
      <Analytics isAccepted={consent === 'accepted'} />
      {isOpen
        ? (
          <section
            aria-label='Analytics choices'
            className='fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-3xl border border-ink bg-cotton p-4 shadow-[5px_5px_0_var(--ink)] sm:inset-x-6 sm:p-5'
          >
            <div className='grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end'>
              <div>
                <h2 className='font-semibold'>A small analytics choice</h2>
                <p className='mt-1 max-w-2xl text-sm leading-6 text-ink-muted'>
                  Analytics is optional and only helps us understand which screens are useful. Your image and chart stay on this device whether you accept or decline.
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <button className='min-h-11 border border-ink px-4 text-sm font-semibold' onClick={() => choose('declined')} type='button'>Decline analytics</button>
                <button className='min-h-11 border border-ink bg-indigo px-4 text-sm font-semibold text-white' onClick={() => choose('accepted')} type='button'>Accept analytics</button>
              </div>
            </div>
          </section>
          )
        : (
          <button
            className='fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 z-30 min-h-11 border border-grid-strong bg-cotton/95 px-3 text-xs font-semibold underline underline-offset-4 shadow-sm sm:bottom-4'
            onClick={() => setIsSettingsOpen(true)}
            type='button'
          >
            Analytics settings
          </button>
          )}
    </>
  )
}

function readConsent (): Consent | null {
  try {
    const stored = localStorage.getItem(consentStorageKey)
    return stored === 'accepted' || stored === 'declined' ? stored : null
  } catch {
    return null
  }
}

function getServerConsent () {
  return undefined
}

function subscribeToConsent (onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(consentEvent, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(consentEvent, onStoreChange)
  }
}
