# Crochet Grids MVP Design

## Product definition

Crochet Grids is a mobile-first web application that converts logos, simple graphics, and basic photos into editable colourwork motif charts for flat single-crochet projects. It bridges image conversion and the practical act of following a crochet chart.

The MVP generates motif charts only. It does not generate garment construction instructions, shaping, increases, decreases, or complete patterns for shirts, hats, bikinis, or other items.

## Goals

- Convert an uploaded JPG, PNG, or WebP into a stitch-by-row colour grid
- Optimise first for logos and simple graphics while supporting basic photos
- Make every chart practical for flat single-crochet colourwork
- Provide touch-friendly editing on phones and richer use of space on larger screens
- Let crocheters follow the chart row by row on-screen
- Export a printable PDF and shareable PNG
- Keep images and projects private by processing and saving them locally

## Non-goals

- Garment sizing, shaping, or construction instructions
- Working in continuous rounds
- Stitch types other than single crochet
- Gauge-based finished-size or yarn-quantity calculations
- Yarn-brand catalogues or automatic product matching
- Accounts, cloud storage, social sharing, or a pattern marketplace
- AI background removal or advanced photo editing
- C2C, mosaic crochet, knitting, or cross-stitch modes

## Primary workflow

1. The user creates a project and uploads an image.
2. The user crops and positions the image, adjusts brightness and contrast, selects the stitch and row counts, chooses a background yarn, and sets a palette limit from 2 to 12 colours.
3. The app generates a limited-colour stitch grid and reports crochet-specific complexity warnings.
4. The user refines the grid and palette with touch-friendly editing tools.
5. The user follows the finished chart one row at a time or exports it as PDF or PNG.
6. The app automatically restores the project and current-row progress on the same device.

## Crochet rules

- One grid cell represents one single-crochet stitch.
- Charts are constructed and followed from the bottom row upward.
- Transparent image pixels become stitches in the chosen background yarn; transparency never means a missing stitch.
- The project records handedness and starting side.
- The default is right-handed, beginning at the bottom-right: odd rows read right-to-left and even rows left-to-right.
- Left-handed charts mirror those directions by default.
- Direction arrows, right-side/wrong-side labels, and written colour runs must use the same calculated row direction.
- The user can mirror the motif without silently changing the saved handedness setting.
- Symbols accompany colours in print and can be enabled on-screen.
- The app clearly labels exports as colourwork motif charts, not complete garment patterns.

## Image conversion

The conversion pipeline runs locally in a Web Worker:

1. Validate and decode the source image.
2. Apply crop, position, brightness, and contrast settings.
3. Composite transparency over the selected background yarn colour.
4. Resize to the requested stitch and row dimensions.
5. Quantise the image to the selected palette size.
6. Optionally remove isolated one-cell speckles while preserving larger colour regions.
7. Store every cell as an index into the project palette.

Dithering is disabled in the MVP because it introduces scattered colour changes that are cumbersome to crochet. The preview offers both square cells and an approximate crochet-cell view. The conversion step is non-destructive: changing preparation settings regenerates from the prepared source image rather than repeatedly processing the existing grid.

## Complexity guidance

Warnings are advisory and never block export. The MVP detects:

- Isolated single-colour cells
- Rows with unusually many colour changes
- Too many distinct colours used within one row
- Palette colours that are difficult to distinguish
- Details likely to disappear at the selected grid size
- Charts large enough to affect performance on the current device

Warnings identify affected rows or regions and suggest a concrete action, such as increasing the grid size, merging colours, or using the cleanup tool.

## Interface

### Home

- Product promise and primary **Create a pattern** call to action above the fold
- Locally saved recent projects
- A concise example explaining image, grid, and finished motif

### Project setup

- Image upload and replacement
- Crop and positioning controls
- Brightness and contrast controls
- Stitch and row inputs
- Palette-size selector from 2 to 12
- Background-yarn colour and name
- Handedness and starting-side settings
- Live conversion preview

### Editor

- Central zoomable and pannable canvas grid
- Pencil, fill, eyedropper, background/erase, replace-colour, mirror, undo, and redo tools
- Editable palette colour, yarn name, and symbol
- Per-colour stitch count and percentage
- Square-grid and crochet-preview toggle
- Non-blocking complexity panel
- Auto-save status and export action

On phones, the grid receives most of the viewport, tools use a horizontally scrollable bottom bar, and palette/settings appear in bottom sheets. Pinch zoom, two-finger pan, and large touch targets reduce accidental edits. Desktop and tablet layouts use a side panel and keyboard shortcuts without changing the underlying workflow.

### Follow mode

- Full-screen, distraction-free chart
- Current row emphasised and completed rows dimmed
- Clear row number, direction arrow, and right-side/wrong-side state
- Written colour runs in the correct working direction
- Previous-row, next-row, and mark-complete actions
- Locally persisted progress

### Export

- PNG options for grid-only or labelled chart output
- PDF cover summary with project name and dimensions
- Numbered chart with markers every five or ten cells
- Direction arrows, palette symbols, yarn names, and legend
- Written colour runs
- Tiled pages with alignment and page-position markers for charts that cannot remain legible on one page

## Technical architecture

- Next.js App Router and TypeScript
- Tailwind CSS for the responsive interface
- A dynamically loaded client-side editor so public pages remain lightweight
- Canvas-based grid rendering for predictable performance across phones and desktops
- Pointer Events for mouse, touch, and stylus input
- A Web Worker for resizing, palette quantisation, and cleanup analysis
- IndexedDB for projects and source-image blobs
- A palette-indexed typed array for the grid
- Operation-based, size-limited undo and redo history
- Local Canvas PNG generation and local PDF generation
- No application server, database, account system, or image upload in the MVP

Modules remain independently testable:

- Image preparation and quantisation
- Pattern grid and editing operations
- Crochet row-direction and instruction generation
- Complexity analysis
- IndexedDB persistence
- Canvas rendering and pointer interaction
- PNG and PDF export

## Project data

Each locally saved project contains:

- ID, name, schema version, creation date, and update date
- Prepared source-image blob and preparation settings
- Stitch count and row count
- Background palette entry
- Palette entries with colour, yarn name, symbol, and stitch totals
- Palette-indexed grid data
- Handedness, starting side, and mirror state
- Current row and completed rows
- Conversion and cleanup settings

The schema is versioned so later releases can migrate locally saved projects without discarding them.

## Limits and failure handling

- Accept JPG, PNG, and WebP files up to 20 MB after verifying the decoded file rather than trusting its extension alone.
- Reject unsupported or corrupt images with a plain-language recovery action.
- Automatically downscale source images whose longest edge exceeds 4096 pixels before processing.
- Initially cap charts at 250 × 250 cells and palettes at 12 colours.
- Show progress during conversion and export, and allow users to cancel long operations.
- Preserve the last valid grid if regeneration fails.
- Detect IndexedDB quota or privacy-mode failures and warn the user that the project is not being saved.
- Keep editing available if PDF generation fails, and offer PNG export independently.
- Restore safely after a refresh without duplicating partially saved projects.

## Privacy, security, and accessibility

- Images and chart data remain on the device and are never transmitted by the application.
- Image decoding, dimensions, file size, project names, and exported text are validated or escaped at their boundaries.
- No remote image URLs are accepted in the MVP.
- Every action is available without relying on colour alone.
- Palette symbols, sufficient contrast, keyboard controls, visible focus states, screen-reader labels, reduced-motion support, and minimum touch-target sizing are required.

## Testing

### Unit tests

- Palette quantisation and transparency-to-background conversion
- Grid painting, filling, colour replacement, mirroring, and history
- Right- and left-handed row directions
- Bottom-to-top, alternating written colour runs
- Complexity warning rules
- Project schema serialisation and migration

### Integration tests

- Upload through generation and editing
- IndexedDB save, refresh, and restore
- Follow-mode progress restoration
- PNG and PDF generation from the same project state
- Failed conversion, failed persistence, and failed export recovery

### End-to-end and visual tests

- Complete phone workflow using touch-sized controls
- Desktop workflow using mouse and keyboard
- Large-grid pan and zoom performance
- Exported PDF page legibility and tiled-page alignment
- Colour-and-symbol legends in colour and grayscale

## Launch requirements

- Custom 404 page
- Page-specific title and description metadata
- Favicon, Open Graph image, robots.txt, and sitemap.xml
- Meaningful alt text for all content images
- Mobile breakpoints, loading states, and error states
- Privacy policy and terms pages
- A visible contact route using raytheboffin@gmail.com
- Privacy-respecting analytics, with consent controls if the selected analytics provider requires them
- Compressed, correctly sized, lazy-loaded marketing images

## Acceptance criteria

The MVP is ready when a user can complete the entire workflow on a phone or desktop: upload a supported image, choose a background and grid size, generate a readable limited-colour chart, correct cells and palette entries, close and restore the project locally, follow alternating rows from the bottom with accurate written colour runs, and export matching PNG and printable PDF files without any image data leaving the device.
