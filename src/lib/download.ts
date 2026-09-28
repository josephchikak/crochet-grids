export type ExportExtension = 'png' | 'pdf'

export function safeExportFilename (projectName: string, extension: ExportExtension) {
  const safeName = projectName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'

  return `crochet-chart-${safeName}.${extension}`
}

export function downloadBlob (blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.rel = 'noopener'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
