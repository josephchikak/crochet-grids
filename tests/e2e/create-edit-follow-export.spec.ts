import { expect, test, type Download } from '@playwright/test'
import { createMotifPng } from './helpers'

test('creates, edits, restores, follows and exports a chart', async ({ page }) => {
  const unexpectedRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:3000') unexpectedRequests.push(request.url())
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) unexpectedRequests.push(`${request.method()} ${request.url()}`)
  })

  await page.goto('/')
  const decline = page.getByRole('button', { name: 'Decline analytics' })
  await decline.click()
  await page.getByRole('link', { name: 'Create a pattern', exact: true }).click()
  await page.getByLabel('Upload image').setInputFiles({
    name: 'logo-transparent.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await page.getByLabel('Stitches').fill('40')
  await page.getByLabel('Rows').fill('32')
  await page.getByRole('button', { name: 'Generate chart' }).click()

  await expect(page.getByText('40 × 32 stitches')).toBeVisible()
  const chart = page.getByRole('application', { name: /pattern chart/i })
  await chart.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()

  const yarnName = page.getByLabel('Yarn name for colour 1')
  if (!await yarnName.isVisible()) await page.getByRole('button', { name: /^palette/i }).click()
  await yarnName.fill('Ecru cotton')
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  const projectUrl = page.url()

  await page.reload()
  await expect(page.getByText('40 × 32 stitches')).toBeVisible()
  if (!await yarnName.isVisible()) await page.getByRole('button', { name: /^palette/i }).click()
  await expect(yarnName).toHaveValue('Ecru cotton')
  const closePanel = page.getByRole('button', { name: 'Close panel' })
  if (await closePanel.isVisible()) await closePanel.click()

  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 1 of 32')).toBeVisible()
  await page.getByRole('button', { name: 'Complete row 1' }).click()
  await expect(page.getByText('Row 2 of 32')).toBeVisible()
  await page.getByRole('button', { name: 'Back to editor' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 2 of 32')).toBeVisible()
  await expect(page.getByText('1 of 32 rows done')).toBeVisible()
  await page.getByRole('button', { name: 'Back to editor' }).click()

  await page.getByRole('button', { name: 'Export chart' }).click()
  const pngDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PNG with labels' }).click()
  const pngDownload = await pngDownloadPromise
  expect(pngDownload.suggestedFilename()).toBe('crochet-chart-logo-transparent.png')
  expect((await readDownload(pngDownload)).subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  )

  await page.getByRole('button', { name: 'Export chart' }).click()
  const pdfDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Printable PDF' }).click()
  const pdfDownload = await pdfDownloadPromise
  expect(pdfDownload.suggestedFilename()).toBe('crochet-chart-logo-transparent.pdf')
  expect((await readDownload(pdfDownload)).subarray(0, 4).toString()).toBe('%PDF')

  expect(page.url()).toBe(projectUrl)
  expect(unexpectedRequests).toEqual([])
})

async function readDownload (download: Download) {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
