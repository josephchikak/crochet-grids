import type { PatternProject } from '@/features/pattern/model/types'
import {
  buildChartRenderModel,
  drawChartRenderModel,
  type ChartExportOptions
} from './render-chart'

export async function exportPng (project: PatternProject, options: ChartExportOptions) {
  const model = buildChartRenderModel(project, options)
  const canvas = document.createElement('canvas')
  canvas.width = model.canvasWidth
  canvas.height = model.canvasHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot render a PNG chart')

  drawChartRenderModel(context, model)
  return await canvasToBlob(canvas)
}

function canvasToBlob (canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The PNG chart could not be created'))
    }, 'image/png')
  })
}
