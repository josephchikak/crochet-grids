/// <reference lib='webworker' />

import { patternLimits } from '@/features/pattern/model/defaults'
import { adjustPixels, compositeBackground, cropToSourcePixels, hexToRgb, rgbToHex } from './pixels'
import { quantizePixels, removeIsolatedSpeckles } from './quantize'
import type {
  ConversionRequest,
  ConversionResult,
  ConversionWorkerMessage,
  ConversionWorkerResponse
} from './conversion-types'

const workerScope: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope
const symbols = ['□', '●', '×', '▲', '◆', '+', '○', '◇', '■', '△', '✦', '–']

workerScope.addEventListener('message', async (event: MessageEvent<ConversionWorkerMessage>) => {
  const { request } = event.data

  try {
    const result = await convertImage(request)
    post({ kind: 'result', id: request.id, result }, [
      result.grid.cells.buffer,
      result.preview.data.buffer
    ])
  } catch (error) {
    post({
      kind: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : 'Image conversion failed'
    })
  }
})

async function convertImage (request: ConversionRequest): Promise<ConversionResult> {
  validateRequest(request)
  const bitmap = await createImageBitmap(request.file)
  const crop = cropToSourcePixels(request.crop, bitmap.width, bitmap.height)
  const canvas = new OffscreenCanvas(request.width, request.height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser cannot prepare image pixels')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.clearRect(0, 0, request.width, request.height)
  context.drawImage(
    bitmap,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    request.width,
    request.height
  )
  bitmap.close()

  const imageData = context.getImageData(0, 0, request.width, request.height)
  const background = hexToRgb(request.background.color)
  const composited = compositeBackground(imageData.data, background)
  const adjusted = adjustPixels(composited, request.brightness, request.contrast)
  const quantized = quantizePixels(adjusted, request.maxColors, background)
  const cells = request.removeSpeckles
    ? removeIsolatedSpeckles(quantized.indices, request.width, request.height)
    : quantized.indices
  const preview = createPreview(cells, quantized.colors, request.width, request.height)
  const palette = quantized.colors.map((color, index) => ({
    id: `color-${index}`,
    name: index === 0 ? request.background.name : `Colour ${index + 1}`,
    color: rgbToHex(color),
    symbol: symbols[index]
  }))

  return {
    grid: { width: request.width, height: request.height, cells },
    palette,
    preview
  }
}

function createPreview (cells: Uint8Array, colors: Array<[number, number, number]>, width: number, height: number) {
  const data = new Uint8ClampedArray(cells.length * 4)

  for (let index = 0; index < cells.length; index += 1) {
    const color = colors[cells[index]]
    const offset = index * 4
    data[offset] = color[0]
    data[offset + 1] = color[1]
    data[offset + 2] = color[2]
    data[offset + 3] = 255
  }

  return new ImageData(data, width, height)
}

function validateRequest (request: ConversionRequest) {
  const validDimension = (value: number) => Number.isInteger(value) &&
    value >= patternLimits.minDimension && value <= patternLimits.maxDimension

  if (!validDimension(request.width) || !validDimension(request.height)) {
    throw new RangeError('Chart dimensions must be between 1 and 250 stitches')
  }
  if (request.maxColors < patternLimits.minColors || request.maxColors > patternLimits.maxColors) {
    throw new RangeError('Yarn colours must be between 2 and 12')
  }
}

function post (message: ConversionWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer)
}
