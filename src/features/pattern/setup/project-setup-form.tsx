'use client'

import { useCallback, useEffect, useId, useRef, useState, cloneElement, type FormEvent, type ReactElement } from 'react'
import { ArrowRight, ImagePlus, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { z } from 'zod'
import { defaultPatternSettings, patternLimits } from '@/features/pattern/model/defaults'
import type { CropSettings, Handedness, PatternProject, StartingSide } from '@/features/pattern/model/types'
import type { ConversionRequest, ConversionResult } from '@/features/pattern/image/conversion-types'
import { ImageCropper } from './image-cropper'

interface ProjectSetupFormProps {
  convertImage: (request: ConversionRequest, signal?: AbortSignal) => Promise<ConversionResult>
  onCreated: (project: PatternProject) => void | Promise<void>
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const fullCrop: CropSettings = { x: 0, y: 0, width: 100, height: 100, zoom: 1 }
const stitchMessage = `Use ${patternLimits.minDimension} to ${patternLimits.maxDimension} stitches.`
const rowMessage = `Use ${patternLimits.minDimension} to ${patternLimits.maxDimension} rows.`
const colourMessage = `Use ${patternLimits.minColors} to ${patternLimits.maxColors} colours.`
const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Name your pattern.').max(80, 'Use 80 characters or fewer.'),
  width: z.number(stitchMessage).int(stitchMessage).min(patternLimits.minDimension, stitchMessage).max(patternLimits.maxDimension, stitchMessage),
  height: z.number(rowMessage).int(rowMessage).min(patternLimits.minDimension, rowMessage).max(patternLimits.maxDimension, rowMessage),
  maxColors: z.number(colourMessage).int(colourMessage).min(patternLimits.minColors, colourMessage).max(patternLimits.maxColors, colourMessage),
  backgroundName: z.string().trim().min(1, 'Name the background yarn.').max(50, 'Use 50 characters or fewer.')
})

type SettingsField = keyof z.infer<typeof settingsSchema>
type FieldErrors = Partial<Record<SettingsField, string>>

export function ProjectSetupForm ({ convertImage, onCreated }: ProjectSetupFormProps) {
  const [file, setFile] = useState<File>()
  const [imageUrl, setImageUrl] = useState<string>()
  const [crop, setCrop] = useState<CropSettings>(fullCrop)
  const [name, setName] = useState('My crochet motif')
  const [width, setWidth] = useState(defaultPatternSettings.width)
  const [height, setHeight] = useState(defaultPatternSettings.height)
  const [maxColors, setMaxColors] = useState(defaultPatternSettings.maxColors)
  const [backgroundName, setBackgroundName] = useState(defaultPatternSettings.backgroundName)
  const [backgroundColor, setBackgroundColor] = useState(defaultPatternSettings.backgroundColor)
  const [handedness, setHandedness] = useState<Handedness>(defaultPatternSettings.handedness)
  const [startingSide, setStartingSide] = useState<StartingSide>(defaultPatternSettings.startingSide)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isConverting, setIsConverting] = useState(false)
  const abortController = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
  }, [imageUrl])

  useEffect(() => () => abortController.current?.abort(), [])

  const handleCropChange = useCallback((area: { x: number, y: number, width: number, height: number }, zoom: number) => {
    setCrop({ ...area, zoom })
  }, [])

  const handleFileChange = useCallback(async (selected?: File) => {
    setError(undefined)
    if (!selected || !(await isSupportedImage(selected))) {
      setFile(undefined)
      setError('Choose a JPG, PNG or WebP image under 20 MB.')
      return
    }

    setFile(selected)
    setCrop(fullCrop)
    setImageUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(selected)
    })
    setName(selected.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'My crochet motif')
  }, [])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(undefined)
    if (!file) {
      setError('Choose an image before generating the chart.')
      return
    }

    const settings = settingsSchema.safeParse({ name, width, height, maxColors, backgroundName })
    if (!settings.success) {
      setFieldErrors(toFieldErrors(settings.error.issues))
      return
    }
    setFieldErrors({})

    const controller = new AbortController()
    abortController.current = controller
    setIsConverting(true)

    try {
      const id = crypto.randomUUID()
      const result = await convertImage({
        id,
        file,
        width,
        height,
        maxColors,
        background: { name: settings.data.backgroundName, color: backgroundColor },
        crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
        brightness,
        contrast,
        removeSpeckles: true
      }, controller.signal)
      const now = new Date().toISOString()

      await onCreated({
        id,
        schemaVersion: 1,
        name: settings.data.name,
        createdAt: now,
        updatedAt: now,
        preparedImage: file,
        imagePreparation: { crop, brightness, contrast, maxColors, removeSpeckles: true },
        grid: result.grid,
        palette: result.palette,
        backgroundPaletteIndex: 0,
        handedness,
        startingSide,
        isMirrored: false,
        currentRow: 1,
        completedRows: []
      })
    } catch (conversionError) {
      if ((conversionError as Error).name !== 'ConversionCancelledError') {
        setError("We couldn't convert this image. Try a smaller image or fewer stitches.")
      }
    } finally {
      setIsConverting(false)
      abortController.current = undefined
    }
  }, [backgroundColor, backgroundName, brightness, contrast, convertImage, crop, file, handedness, height, maxColors, name, onCreated, startingSide, width])

  return (
    <form className='grid gap-8 lg:grid-cols-[1.1fr_0.9fr]' noValidate onSubmit={handleSubmit}>
      <section className='border border-grid bg-white/35 p-4 sm:p-6'>
        <h2 className='text-2xl font-semibold tracking-[-0.035em]'>1. Choose and frame your image</h2>
        <label className='mt-5 flex min-h-14 cursor-pointer items-center justify-center gap-2 border border-dashed border-ink bg-cotton px-4 font-semibold hover:bg-sage/40'>
          <ImagePlus aria-hidden='true' size={20} />
          {file ? 'Replace image' : 'Upload image'}
          <input
            accept='.jpg,.jpeg,.png,.webp'
            aria-label='Upload image'
            className='sr-only'
            onChange={(event) => void handleFileChange(event.target.files?.[0])}
            type='file'
          />
        </label>
        {imageUrl
          ? <div className='mt-5'><ImageCropper aspect={cropAspect(width, height)} imageUrl={imageUrl} onCropChange={handleCropChange} /></div>
          : <div className='mt-5 grid aspect-[4/3] place-items-center border border-grid bg-sage/35 px-8 text-center text-ink-muted'>Your crop preview will appear here.</div>}
        <div className='mt-5 grid grid-cols-2 gap-4'>
          <RangeControl label='Brightness' value={brightness} onChange={setBrightness} />
          <RangeControl label='Contrast' value={contrast} onChange={setContrast} />
        </div>
      </section>

      <section className='border border-grid bg-cotton p-4 sm:p-6'>
        <h2 className='text-2xl font-semibold tracking-[-0.035em]'>2. Set up the chart</h2>
        <div className='mt-6 grid gap-5'>
          <Field error={fieldErrors.name} label='Pattern name'><input className='form-control' onChange={(event) => setName(event.target.value)} value={name} /></Field>
          <div className='grid grid-cols-2 gap-4'>
            <Field error={fieldErrors.width} label='Stitches'><input className='form-control' max={patternLimits.maxDimension} min={patternLimits.minDimension} onChange={(event) => setWidth(event.target.valueAsNumber)} type='number' value={Number.isNaN(width) ? '' : width} /></Field>
            <Field error={fieldErrors.height} label='Rows'><input className='form-control' max={patternLimits.maxDimension} min={patternLimits.minDimension} onChange={(event) => setHeight(event.target.valueAsNumber)} type='number' value={Number.isNaN(height) ? '' : height} /></Field>
          </div>
          <Field error={fieldErrors.maxColors} label='Yarn colours'><input className='form-control' max={patternLimits.maxColors} min={patternLimits.minColors} onChange={(event) => setMaxColors(event.target.valueAsNumber)} type='number' value={Number.isNaN(maxColors) ? '' : maxColors} /></Field>
          <div className='grid grid-cols-[1fr_56px] gap-3'>
            <Field error={fieldErrors.backgroundName} label='Background yarn'><input className='form-control' onChange={(event) => setBackgroundName(event.target.value)} value={backgroundName} /></Field>
            <Field label='Colour'><input aria-label='Background colour' className='h-12 w-full border border-grid bg-transparent p-1' onChange={(event) => setBackgroundColor(event.target.value)} type='color' value={backgroundColor} /></Field>
          </div>
          <fieldset className='grid gap-2'>
            <legend className='text-sm font-semibold'>Crochet hand</legend>
            <Choice label='Right-handed' checked={handedness === 'right'} onChange={() => setHandedness('right')} name='hand' />
            <Choice label='Left-handed' checked={handedness === 'left'} onChange={() => setHandedness('left')} name='hand' />
          </fieldset>
          <fieldset className='grid gap-2'>
            <legend className='text-sm font-semibold'>First-row starting side</legend>
            <Choice label='Start on the right' checked={startingSide === 'right'} onChange={() => setStartingSide('right')} name='start' />
            <Choice label='Start on the left' checked={startingSide === 'left'} onChange={() => setStartingSide('left')} name='start' />
          </fieldset>
        </div>

        {isConverting && <p className='mt-5 text-sm font-semibold' role='status'>Converting your image into stitches…</p>}
        {error && <p className='mt-5 border border-poppy bg-poppy/10 p-3 text-sm font-semibold' role='alert'>{error}</p>}
        <div className='mt-6 flex items-center gap-3 text-xs text-ink-muted'><ShieldCheck aria-hidden='true' size={17} /> Your image stays on this device.</div>
        <div className='mt-6 flex gap-3'>
          <button className='primary-action flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-60' disabled={isConverting} type='submit'>
            {isConverting ? <LoaderCircle aria-hidden='true' className='animate-spin' size={18} /> : <ArrowRight aria-hidden='true' size={18} />}
            {isConverting ? 'Building chart…' : 'Generate chart'}
          </button>
          {isConverting && <button aria-label='Cancel conversion' className='grid size-[52px] place-items-center border border-ink' onClick={() => abortController.current?.abort()} type='button'><X aria-hidden='true' /></button>}
        </div>
      </section>
    </form>
  )
}

function Field ({ label, error, children }: { label: string, error?: string, children: ReactElement<{ 'aria-describedby'?: string, 'aria-invalid'?: boolean }> }) {
  const errorId = useId()
  const control = error
    ? cloneElement(children, { 'aria-describedby': errorId, 'aria-invalid': true })
    : children

  return (
    <div className='grid gap-2 text-sm font-semibold'>
      <label className='grid gap-2'>{label}{control}</label>
      {error && <p className='text-poppy' id={errorId}>{error}</p>}
    </div>
  )
}

function toFieldErrors (issues: z.core.$ZodIssue[]) {
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path[0] as SettingsField
    errors[field] ??= issue.message
  }
  return errors
}

function cropAspect (width: number, height: number) {
  return width > 0 && height > 0 ? width / height : 1
}

function Choice ({ label, checked, onChange, name }: { label: string, checked: boolean, onChange: () => void, name: string }) {
  return <label className='flex min-h-11 items-center gap-3 border border-grid px-3'><input checked={checked} name={name} onChange={onChange} type='radio' />{label}</label>
}

function RangeControl ({ label, value, onChange }: { label: string, value: number, onChange: (value: number) => void }) {
  return <label className='grid gap-2 text-sm font-semibold'>{label}<input aria-label={label} className='accent-indigo' max='100' min='-100' onChange={(event) => onChange(Number(event.target.value))} type='range' value={value} /></label>
}

async function isSupportedImage (file: File) {
  if (file.size > patternLimits.maxFileBytes || !imageTypes.includes(file.type)) return false
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => bytes[index] === byte)
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return isJpeg || isPng || isWebp
}
