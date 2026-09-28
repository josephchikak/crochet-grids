import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversionResult } from '@/features/pattern/image/conversion-types'
import { ProjectSetupForm } from './project-setup-form'

vi.mock('./image-cropper', () => ({
  ImageCropper: () => <div data-testid='image-cropper' />
}))

const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]

function pngFile (name = 'logo.png') {
  return new File([Uint8Array.from(pngBytes)], name, { type: 'image/png' })
}

const conversionResult: ConversionResult = {
  grid: { width: 60, height: 60, cells: new Uint8Array(3600) },
  palette: [
    { id: 'color-0', name: 'Natural cotton', color: '#f1ebdd', symbol: '□' },
    { id: 'color-1', name: 'Colour 2', color: '#111111', symbol: '●' }
  ],
  preview: {} as ImageData
}

describe('ProjectSetupForm', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn()
    }))
  })

  it('starts with crochet-friendly chart defaults', () => {
    render(<ProjectSetupForm convertImage={vi.fn()} onCreated={vi.fn()} />)

    expect(screen.getByLabelText('Stitches')).toHaveValue(60)
    expect(screen.getByLabelText('Rows')).toHaveValue(60)
    expect(screen.getByLabelText('Yarn colours')).toHaveValue(4)
    expect(screen.getByLabelText('Background yarn')).toHaveValue('Natural cotton')
    expect(screen.getByLabelText('Right-handed')).toBeChecked()
    expect(screen.getByLabelText('Start on the right')).toBeChecked()
  })

  it('rejects unsupported images with a recovery message', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<ProjectSetupForm convertImage={vi.fn()} onCreated={vi.fn()} />)

    await user.upload(
      screen.getByLabelText('Upload image'),
      new File(['text'], 'notes.txt', { type: 'text/plain' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a JPG, PNG or WebP image under 20 MB.'
    )
  })

  it('rejects files that only claim to be images', async () => {
    const user = userEvent.setup()
    render(<ProjectSetupForm convertImage={vi.fn()} onCreated={vi.fn()} />)

    await user.upload(
      screen.getByLabelText('Upload image'),
      new File(['not really a png'], 'fake.png', { type: 'image/png' })
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a JPG, PNG or WebP image under 20 MB.'
    )
  })

  it('converts the image and creates a project with background index 0', async () => {
    const user = userEvent.setup()
    const convertImage = vi.fn().mockResolvedValue(conversionResult)
    const onCreated = vi.fn()
    render(<ProjectSetupForm convertImage={convertImage} onCreated={onCreated} />)

    await user.upload(screen.getByLabelText('Upload image'), pngFile())
    await screen.findByTestId('image-cropper')
    await user.click(screen.getByRole('button', { name: 'Generate chart' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(convertImage).toHaveBeenCalledWith(expect.objectContaining({
      width: 60,
      height: 60,
      maxColors: 4,
      background: { name: 'Natural cotton', color: '#f1ebdd' },
      crop: { x: 0, y: 0, width: 100, height: 100 }
    }), expect.any(AbortSignal))
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({
      name: 'logo',
      grid: conversionResult.grid,
      palette: conversionResult.palette,
      backgroundPaletteIndex: 0,
      handedness: 'right',
      startingSide: 'right',
      isMirrored: false,
      currentRow: 1,
      completedRows: []
    }))
  })

  it('shows progress and blocks duplicate submission while converting', async () => {
    const user = userEvent.setup()
    const convertImage = vi.fn(() => new Promise<ConversionResult>(() => {}))
    render(<ProjectSetupForm convertImage={convertImage} onCreated={vi.fn()} />)

    await user.upload(screen.getByLabelText('Upload image'), pngFile())
    await screen.findByTestId('image-cropper')
    await user.click(screen.getByRole('button', { name: 'Generate chart' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/converting your image/i)
    const submit = screen.getByRole('button', { name: /building chart/i })
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(convertImage).toHaveBeenCalledTimes(1)
  })

  it('cancels a conversion and restores the form without an error', async () => {
    const user = userEvent.setup()
    const convertImage = vi.fn((_request: unknown, signal?: AbortSignal) =>
      new Promise<ConversionResult>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const error = new Error('cancelled')
          error.name = 'ConversionCancelledError'
          reject(error)
        })
      }))
    const onCreated = vi.fn()
    render(<ProjectSetupForm convertImage={convertImage} onCreated={onCreated} />)

    await user.upload(screen.getByLabelText('Upload image'), pngFile())
    await screen.findByTestId('image-cropper')
    await user.clear(screen.getByLabelText('Stitches'))
    await user.type(screen.getByLabelText('Stitches'), '40')
    await user.click(screen.getByRole('button', { name: 'Generate chart' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel conversion' }))

    expect(await screen.findByRole('button', { name: 'Generate chart' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Stitches')).toHaveValue(40)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('keeps settings and explains recovery when conversion fails', async () => {
    const user = userEvent.setup()
    const convertImage = vi.fn().mockRejectedValue(new Error('decode failed'))
    render(<ProjectSetupForm convertImage={convertImage} onCreated={vi.fn()} />)

    await user.upload(screen.getByLabelText('Upload image'), pngFile())
    await screen.findByTestId('image-cropper')
    await user.clear(screen.getByLabelText('Rows'))
    await user.type(screen.getByLabelText('Rows'), '32')
    await user.click(screen.getByRole('button', { name: 'Generate chart' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't convert this image. Try a smaller image or fewer stitches."
    )
    expect(screen.getByLabelText('Rows')).toHaveValue(32)
  })

  it('shows validation errors next to the invalid control', async () => {
    const user = userEvent.setup()
    const convertImage = vi.fn()
    render(<ProjectSetupForm convertImage={convertImage} onCreated={vi.fn()} />)

    await user.upload(screen.getByLabelText('Upload image'), pngFile())
    await screen.findByTestId('image-cropper')
    await user.clear(screen.getByLabelText('Stitches'))
    await user.type(screen.getByLabelText('Stitches'), '300')
    await user.clear(screen.getByLabelText('Yarn colours'))
    await user.type(screen.getByLabelText('Yarn colours'), '13')
    await user.click(screen.getByRole('button', { name: 'Generate chart' }))

    expect(screen.getByLabelText('Stitches')).toHaveAccessibleDescription('Use 1 to 250 stitches.')
    expect(screen.getByLabelText('Stitches')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Yarn colours')).toHaveAccessibleDescription('Use 2 to 12 colours.')
    expect(convertImage).not.toHaveBeenCalled()
  })

  it('starts left-handed charts on the left by default', async () => {
    const user = userEvent.setup()
    render(<ProjectSetupForm convertImage={vi.fn()} onCreated={vi.fn()} />)

    await user.click(screen.getByLabelText('Left-handed'))
    expect(screen.getByLabelText('Start on the left')).toBeChecked()

    await user.click(screen.getByLabelText('Start on the right'))
    expect(screen.getByLabelText('Left-handed')).toBeChecked()
    expect(screen.getByLabelText('Start on the right')).toBeChecked()
  })
})
