import type { Rgb } from './pixels'

interface ColorSample {
  color: Rgb
  count: number
}

interface ColorBox {
  samples: ColorSample[]
}

export function quantizePixels (
  rgba: Uint8ClampedArray,
  maxColors: number,
  lockedBackground: Rgb
): { colors: Rgb[], indices: Uint8Array } {
  if (maxColors < 2 || maxColors > 12) {
    throw new RangeError('Yarn colours must be between 2 and 12')
  }

  const samples = collectSamples(rgba, lockedBackground)
  const boxes: ColorBox[] = samples.length > 0 ? [{ samples }] : []

  while (boxes.length < maxColors - 1) {
    const boxIndex = chooseBoxToSplit(boxes)
    if (boxIndex === -1) break

    const [box] = boxes.splice(boxIndex, 1)
    const split = splitBox(box)
    if (!split) {
      boxes.push(box)
      break
    }
    boxes.push(...split)
  }

  const reduced = boxes.map(averageBox)
  const colors = [lockedBackground, ...reduced]
    .slice(0, maxColors)
    .sort((left, right) => {
      if (sameColor(left, lockedBackground)) return -1
      if (sameColor(right, lockedBackground)) return 1
      return luminance(left) - luminance(right)
    })
  const indices = new Uint8Array(rgba.length / 4)

  for (let pixel = 0; pixel < indices.length; pixel += 1) {
    const offset = pixel * 4
    indices[pixel] = findClosestColor(
      [rgba[offset], rgba[offset + 1], rgba[offset + 2]],
      colors
    )
  }

  return { colors, indices }
}

export function removeIsolatedSpeckles (
  indices: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = indices.slice()

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column
      const neighbors: number[] = []

      if (column > 0) neighbors.push(indices[index - 1])
      if (column < width - 1) neighbors.push(indices[index + 1])
      if (row > 0) neighbors.push(indices[index - width])
      if (row < height - 1) neighbors.push(indices[index + width])

      if (neighbors.includes(indices[index])) continue
      const majority = getMajority(neighbors)
      if (majority !== undefined) result[index] = majority
    }
  }

  return result
}

// Canvas pixels run top row first; pattern grids run from crochet row 1 at the bottom
export function imageRowsToGridRows (
  indices: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(indices.length)

  for (let row = 0; row < height; row += 1) {
    const source = (height - 1 - row) * width
    result.set(indices.subarray(source, source + width), row * width)
  }

  return result
}

function collectSamples (rgba: Uint8ClampedArray, background: Rgb) {
  const counts = new Map<string, ColorSample>()

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const color: Rgb = [rgba[offset], rgba[offset + 1], rgba[offset + 2]]
    if (sameColor(color, background)) continue

    const key = color.join(',')
    const sample = counts.get(key)
    if (sample) sample.count += 1
    else counts.set(key, { color, count: 1 })
  }

  return [...counts.values()].sort((left, right) =>
    left.color[0] - right.color[0] ||
    left.color[1] - right.color[1] ||
    left.color[2] - right.color[2]
  )
}

function chooseBoxToSplit (boxes: ColorBox[]) {
  let bestIndex = -1
  let bestScore = -1

  boxes.forEach((box, index) => {
    if (box.samples.length < 2) return
    const { range } = getSplitChannel(box)
    const population = box.samples.reduce((total, sample) => total + sample.count, 0)
    const score = range * population

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}

function splitBox (box: ColorBox): [ColorBox, ColorBox] | undefined {
  if (box.samples.length < 2) return undefined
  const { channel } = getSplitChannel(box)
  const samples = [...box.samples].sort((left, right) =>
    left.color[channel] - right.color[channel]
  )
  const population = samples.reduce((total, sample) => total + sample.count, 0)
  let running = 0
  let splitIndex = 1

  for (let index = 0; index < samples.length - 1; index += 1) {
    running += samples[index].count
    if (running >= population / 2) {
      splitIndex = index + 1
      break
    }
  }

  return [
    { samples: samples.slice(0, splitIndex) },
    { samples: samples.slice(splitIndex) }
  ]
}

function getSplitChannel (box: ColorBox) {
  const ranges = [0, 1, 2].map((channel) => {
    const values = box.samples.map((sample) => sample.color[channel])
    return Math.max(...values) - Math.min(...values)
  })
  const range = Math.max(...ranges)
  return { channel: ranges.indexOf(range), range }
}

function averageBox (box: ColorBox): Rgb {
  const population = box.samples.reduce((total, sample) => total + sample.count, 0)
  return [0, 1, 2].map((channel) => Math.round(
    box.samples.reduce(
      (total, sample) => total + sample.color[channel] * sample.count,
      0
    ) / population
  )) as Rgb
}

function findClosestColor (color: Rgb, palette: Rgb[]) {
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  palette.forEach((candidate, index) => {
    const distance = color.reduce((total, channel, channelIndex) => {
      const difference = channel - candidate[channelIndex]
      return total + difference * difference
    }, 0)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  return closestIndex
}

function getMajority (values: number[]) {
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)

  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1])
  if (!sorted[0] || sorted[0][1] < 2) return undefined
  return sorted[0][0]
}

function sameColor (left: Rgb, right: Rgb) {
  return left.every((channel, index) => channel === right[index])
}

function luminance ([red, green, blue]: Rgb) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}
