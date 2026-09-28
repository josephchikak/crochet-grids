import { describe, expect, it } from 'vitest'
import { adjustPixels, compositeBackground, cropToSourcePixels } from './pixels'
import { quantizePixels, removeIsolatedSpeckles } from './quantize'

describe('image pixel preparation', () => {
  it('composites transparent pixels into the background yarn', () => {
    const pixels = Uint8ClampedArray.from([
      255, 0, 0, 0,
      255, 0, 0, 255
    ])

    expect(Array.from(compositeBackground(pixels, [245, 239, 227]))).toEqual([
      245, 239, 227, 255,
      255, 0, 0, 255
    ])
  })

  it('adjusts brightness and contrast while clamping channels', () => {
    const pixels = Uint8ClampedArray.from([250, 128, 5, 255])

    expect(Array.from(adjustPixels(pixels, 20, 0))).toEqual([255, 179, 56, 255])
    expect(Array.from(adjustPixels(pixels, 0, 100))).toEqual([255, 128, 0, 255])
  })
})

describe('palette reduction', () => {
  it('reserves palette index zero for the chosen background', () => {
    const pixels = Uint8ClampedArray.from([
      245, 239, 227, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255
    ])
    const result = quantizePixels(pixels, 3, [245, 239, 227])

    expect(result.colors[0]).toEqual([245, 239, 227])
    expect(result.colors).toHaveLength(3)
    expect(result.indices[0]).toBe(0)
    expect(result.indices[1]).toBe(result.indices[2])
    expect(result.indices[3]).not.toBe(result.indices[1])
  })

  it('is deterministic for identical source pixels', () => {
    const pixels = Uint8ClampedArray.from([
      20, 20, 20, 255,
      220, 30, 30, 255,
      20, 30, 220, 255,
      20, 20, 20, 255
    ])

    expect(quantizePixels(pixels, 3, [20, 20, 20]))
      .toEqual(quantizePixels(pixels, 3, [20, 20, 20]))
  })

  it('replaces an isolated cell with the orthogonal majority', () => {
    const indices = Uint8Array.from([
      0, 0, 0,
      0, 1, 0,
      0, 0, 0
    ])

    expect(Array.from(removeIsolatedSpeckles(indices, 3, 3))).toEqual([
      0, 0, 0,
      0, 0, 0,
      0, 0, 0
    ])
  })
})

describe('crop preparation', () => {
  it('converts percentage crops into source pixels', () => {
    expect(cropToSourcePixels({ x: 10, y: 25, width: 50, height: 50 }, 400, 200))
      .toEqual({ x: 40, y: 50, width: 200, height: 100 })
  })

  it('clamps crops that extend past the source', () => {
    expect(cropToSourcePixels({ x: 90, y: -10, width: 50, height: 200 }, 100, 100))
      .toEqual({ x: 90, y: 0, width: 10, height: 100 })
  })
})
