import zlib from 'node:zlib'
import type { Page } from '@playwright/test'

// Records an analytics choice before any page loads so the consent banner never covers controls
export async function declineAnalytics (page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('crochet-grids-analytics', 'declined')
  })
}

// Builds a small RGBA PNG in memory: a solid square motif on a transparent field
export function createMotifPng (width = 40, height = 40) {
  return encodePng(width, height, (x, y) => {
    const inside = x >= width / 4 && x < width * 3 / 4 && y >= height / 4 && y < height * 3 / 4
    return inside ? [200, 40, 60, 255] : [0, 0, 0, 0]
  })
}

// Top half red with a green top-left corner, bottom half blue: shows if a chart is flipped
export function createOrientationPng (size = 40) {
  return encodePng(size, size, (x, y) => {
    if (x < size / 4 && y < size / 4) return [0, 160, 60, 255]
    return y < size / 2 ? [220, 30, 30, 255] : [30, 60, 220, 255]
  })
}

function encodePng (
  width: number,
  height: number,
  pixelAt: (x: number, y: number) => [number, number, number, number]
) {
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      raw.set(pixelAt(x, y), y * stride + 1 + x * 4)
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function chunk (type: string, data: Buffer) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, checksum])
}

function crc32 (bytes: Buffer) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  return (crc ^ 0xffffffff) >>> 0
}
