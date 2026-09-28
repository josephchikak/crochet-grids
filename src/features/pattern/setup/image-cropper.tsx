'use client'

import { useCallback, useState, type ComponentType } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'

interface ImageCropperProps {
  imageUrl: string
  aspect: number
  // Receives the crop as percentages of the source image
  onCropChange: (area: Area, zoom: number) => void
}

interface EasyCropProps {
  image: string
  crop: Point
  zoom: number
  aspect: number
  onCropChange: (point: Point) => void
  onCropComplete: (area: Area, pixels: Area) => void
  onZoomChange: (zoom: number) => void
  showGrid: boolean
}

const EasyCrop = Cropper as unknown as ComponentType<EasyCropProps>

export function ImageCropper ({ imageUrl, aspect, onCropChange }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const handleComplete = useCallback((area: Area) => {
    onCropChange(area, zoom)
  }, [onCropChange, zoom])

  return (
    <div>
      <div className='relative aspect-[4/3] overflow-hidden border border-grid bg-ink'>
        <EasyCrop
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={handleComplete}
          onZoomChange={setZoom}
          showGrid={false}
        />
      </div>
      <label className='mt-4 grid gap-2 text-sm font-semibold'>
        Image zoom
        <input
          aria-label='Image zoom'
          className='accent-indigo'
          max='3'
          min='1'
          onChange={(event) => setZoom(Number(event.target.value))}
          step='0.05'
          type='range'
          value={zoom}
        />
      </label>
    </div>
  )
}
