import { expect, test } from '@playwright/test'
import { createMotifPng, declineAnalytics } from './helpers'

test('restores a saved chart after a reload and lists it on the home page', async ({ page }) => {
  await declineAnalytics(page)
  await page.goto('/create')
  await page.getByLabel('Upload image').setInputFiles({
    name: 'saved-motif.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await page.getByLabel('Stitches').fill('24')
  await page.getByLabel('Rows').fill('18')
  await page.getByRole('button', { name: 'Generate chart' }).click()
  await expect(page.getByText('24 × 18 stitches')).toBeVisible()

  const firstYarn = page.getByLabel('Yarn name for colour 1')
  if (!await firstYarn.isVisible()) await page.getByRole('button', { name: /^palette/i }).click()
  await firstYarn.fill('Cream cotton')
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()

  const projectUrl = page.url()
  await page.reload()
  await expect(page.getByText('24 × 18 stitches')).toBeVisible()
  if (!await firstYarn.isVisible()) await page.getByRole('button', { name: /^palette/i }).click()
  await expect(firstYarn).toHaveValue('Cream cotton')

  await page.goto('/')
  await page.getByRole('link', { name: 'Continue saved-motif' }).click()
  await expect(page).toHaveURL(projectUrl)
})

test('restores follow-mode progress after a reload', async ({ page }) => {
  await declineAnalytics(page)
  await page.goto('/create')
  await page.getByLabel('Upload image').setInputFiles({
    name: 'follow-motif.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await page.getByLabel('Stitches').fill('20')
  await page.getByLabel('Rows').fill('12')
  await page.getByRole('button', { name: 'Generate chart' }).click()

  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 1 of 12')).toBeVisible()
  await page.getByRole('button', { name: 'Complete row 1' }).click()
  await page.getByRole('button', { name: 'Complete row 2' }).click()
  await expect(page.getByText('Row 3 of 12')).toBeVisible()
  await page.getByRole('button', { name: 'Back to editor' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 3 of 12')).toBeVisible()
  await expect(page.getByText('2 of 12 rows done')).toBeVisible()
})
