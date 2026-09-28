export type Rgb = [number, number, number]

export function compositeBackground (
  rgba: Uint8ClampedArray,
  background: Rgb
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(rgba.length)

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const alpha = rgba[offset + 3] / 255

    result[offset] = blend(rgba[offset], background[0], alpha)
    result[offset + 1] = blend(rgba[offset + 1], background[1], alpha)
    result[offset + 2] = blend(rgba[offset + 2], background[2], alpha)
    result[offset + 3] = 255
  }

  return result
}

export function adjustPixels (
  rgba: Uint8ClampedArray,
  brightness: number,
  contrast: number
): Uint8ClampedArray {
  const result = rgba.slice()
  const brightnessOffset = 255 * clamp(brightness, -100, 100) / 100
  const contrastFactor = 1 + clamp(contrast, -100, 100) / 100

  for (let offset = 0; offset < result.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const brightened = result[offset + channel] + brightnessOffset
      result[offset + channel] = clamp(
        (brightened - 128) * contrastFactor + 128,
        0,
        255
      )
    }
  }

  return result
}

export function hexToRgb (hex: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match) throw new Error(`Invalid yarn colour: ${hex}`)

  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16)
  ]
}

export function rgbToHex ([red, green, blue]: Rgb) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function cropToSourcePixels (
  percentCrop: CropArea,
  sourceWidth: number,
  sourceHeight: number
): CropArea {
  const x = clamp(Math.round(percentCrop.x / 100 * sourceWidth), 0, sourceWidth - 1)
  const y = clamp(Math.round(percentCrop.y / 100 * sourceHeight), 0, sourceHeight - 1)
  const width = clamp(Math.round(percentCrop.width / 100 * sourceWidth), 1, sourceWidth - x)
  const height = clamp(Math.round(percentCrop.height / 100 * sourceHeight), 1, sourceHeight - y)
  return { x, y, width, height }
}

function blend (foreground: number, background: number, alpha: number) {
  return Math.round(foreground * alpha + background * (1 - alpha))
}

function clamp (value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
