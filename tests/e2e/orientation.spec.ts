import { expect, test } from '@playwright/test'
import { createOrientationPng, declineAnalytics } from './helpers'

test('keeps the uploaded image the right way up in the chart', async ({ page }) => {
  await declineAnalytics(page)
  await page.goto('/create')

  await page.getByLabel('Upload image').setInputFiles({
    name: 'orientation.png',
    mimeType: 'image/png',
    buffer: createOrientationPng()
  })
  await page.getByLabel('Stitches').fill('8')
  await page.getByLabel('Rows').fill('8')
  await page.getByRole('button', { name: 'Generate chart' }).click()
  await expect(page.getByText('8 × 8 stitches')).toBeVisible()

  const project = await page.evaluate(() => new Promise<{ palette: string[], cells: number[] }>((resolve, reject) => {
    const request = indexedDB.open('crochet-grids')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const read = request.result.transaction('projects').objectStore('projects').getAll()
      read.onsuccess = () => {
        const saved = read.result.find((item: { name: string }) => item.name === 'orientation')
        resolve({
          palette: saved.palette.map((entry: { color: string }) => entry.color),
          cells: Array.from(saved.grid.cells as Uint8Array)
        })
      }
    }
  }))
  const hue = (paletteIndex: number) => {
    const value = Number.parseInt(project.palette[paletteIndex].slice(1), 16)
    const [red, green, blue] = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    return red > green && red > blue ? 'red' : green > blue ? 'green' : 'blue'
  }
  const cellHue = (column: number, row: number) => hue(project.cells[row * 8 + column])

  // Grid row 0 is crochet row 1, the bottom of the picture
  expect(cellHue(4, 0)).toBe('blue')
  expect(cellHue(0, 0)).toBe('blue')
  expect(cellHue(4, 7)).toBe('red')
  expect(cellHue(0, 7)).toBe('green')
  expect(cellHue(7, 7)).toBe('red')
})
