import { ImageResponse } from 'next/og'

export const alt = 'A colourful crochet motif chart on a warm paper background'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage () {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#f1ebdd', color: '#182019', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ width: '56%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 28, fontWeight: 700 }}>
            <div style={{ width: 38, height: 38, display: 'flex', flexWrap: 'wrap', border: '2px solid #182019' }}>
              <span style={{ width: 17, height: 17, background: '#2946d3', borderRight: '2px solid #182019', borderBottom: '2px solid #182019' }} />
              <span style={{ width: 17, height: 17, background: '#ef6045', borderBottom: '2px solid #182019' }} />
              <span style={{ width: 17, height: 17, borderRight: '2px solid #182019' }} />
              <span style={{ width: 17, height: 17, background: '#2946d3' }} />
            </div>
            Crochet Grids
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, lineHeight: 0.95, letterSpacing: '-4px', fontWeight: 700 }}>
              <span>Image in.</span>
              <span>Crochet chart out.</span>
            </div>
            <div style={{ marginTop: 28, fontSize: 25, color: '#4f5a51' }}>Private, editable and ready to follow row by row.</div>
          </div>
        </div>
        <div style={{ width: '44%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#b9c7af' }}>
          <div style={{ width: 390, height: 390, display: 'flex', flexWrap: 'wrap', border: '3px solid #182019', boxShadow: '14px 14px 0 #182019' }}>
            {Array.from({ length: 100 }, (_, index) => {
              const row = Math.floor(index / 10)
              const column = index % 10
              const isHeart = row > 1 && row < 8 && ((column > 1 && column < 5) || (column > 5 && column < 9)) && row < 5 || row >= 5 && column > row - 4 && column < 14 - row
              return <span key={index} style={{ width: 39, height: 39, background: isHeart ? '#ef6045' : '#f1ebdd', borderRight: '1px solid #9f9788', borderBottom: '1px solid #9f9788' }} />
            })}
          </div>
        </div>
      </div>
    ),
    size
  )
}
