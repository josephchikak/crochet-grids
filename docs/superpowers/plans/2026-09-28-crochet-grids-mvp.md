# Crochet Grids MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app that turns a local image into an editable, locally saved, flat single-crochet motif chart with follow mode and PDF/PNG export.

**Architecture:** Use a statically deployable Next.js App Router shell around a dynamically loaded client editor. Keep the domain, image conversion, grid operations, persistence, instructions, analysis, and export modules pure or boundary-focused so each can be tested independently; all image and project data remains in the browser.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Canvas, Web Workers, IndexedDB through `idb`, Zod, jsPDF, Vitest, Testing Library, Playwright, axe-core, and Vercel Analytics behind consent.

**Spec:** `docs/superpowers/specs/2026-09-28-crochet-grids-design.md`

## Global Constraints

- Require Node.js 20.9 or newer, matching the current Next.js system requirement.
- Use TypeScript, App Router, Server Components by default, and client components only at browser API or interaction boundaries.
- Use Standard.js-style formatting: 2 spaces, single quotes, no semicolons, strict equality, and no unused variables.
- Keep uploaded images, grids, projects, and exports entirely on-device.
- Support JPG, PNG, and WebP files up to 20 MB; downscale sources whose longest edge exceeds 4096 pixels.
- Cap charts at 250 × 250 cells and palettes at 2–12 colours.
- Treat grid row index `0` as crochet row 1, the bottom row; rendering converts it to the bottom of the canvas.
- Treat transparent source pixels as the selected background yarn, never as missing stitches.
- Target flat single-crochet motifs only; do not add garment shaping, rounds, gauge, cloud accounts, or yarn catalogues.
- Maintain first-class phone editing with touch targets of at least 44 × 44 CSS pixels.
- Dynamically import the editor, PDF exporter, and other non-critical browser-only code.
- Every task follows red-green-refactor, runs its focused tests, and commits only its own coherent change.

## File Structure

```text
src/
  app/
    create/page.tsx                  project setup route
    projects/[projectId]/page.tsx   editor route
    privacy/page.tsx                privacy policy
    terms/page.tsx                  terms
    thank-you/page.tsx              post-feedback confirmation
    icon.svg                        favicon
    opengraph-image.tsx             generated social image
    layout.tsx                      global metadata and shell
    page.tsx                        landing and recent projects
    not-found.tsx                   custom 404
    robots.ts                       robots metadata
    sitemap.ts                      sitemap metadata
  components/
    site-header.tsx                 public navigation
    consent-banner.tsx              analytics consent
    analytics.tsx                   consent-gated analytics boundary
  features/pattern/
    model/types.ts                  project, palette, grid, run, and warning types
    model/defaults.ts               new-project defaults and limits
    crochet/instructions.ts         directions, sides, and written colour runs
    crochet/instructions.test.ts
    grid/operations.ts              immutable grid editing primitives
    grid/history.ts                 patch-based undo and redo
    grid/operations.test.ts
    image/pixels.ts                 pure RGBA adjustment and compositing
    image/quantize.ts               deterministic palette reduction
    image/conversion.worker.ts      browser decoding, resizing, and conversion worker
    image/conversion-client.ts      typed worker request lifecycle
    image/image.test.ts
    setup/project-setup-form.tsx    setup workflow
    setup/image-cropper.tsx         touch crop, zoom, and position UI
    setup/project-setup.test.tsx
    editor/pattern-editor.tsx       editor composition and state reducer
    editor/pattern-canvas.tsx       canvas rendering and pointer mapping
    editor/editor-toolbar.tsx       paint, fill, pick, mirror, history actions
    editor/palette-panel.tsx        palette names, colours, symbols, totals
    editor/editor.test.tsx
    analysis/analyse-pattern.ts     crochet difficulty diagnostics
    analysis/analyse-pattern.test.ts
    persistence/database.ts         IndexedDB schema and migration
    persistence/project-repository.ts project CRUD boundary
    persistence/project-repository.test.ts
    follow/follow-mode.tsx          row-focused chart reader
    follow/follow-mode.test.tsx
    export/render-chart.ts          shared chart layout model
    export/png-export.ts            high-resolution PNG generation
    export/pdf-export.ts            printable and tiled PDF generation
    export/export.test.ts
  lib/
    cn.ts                            class-name helper
    download.ts                      safe local download helper
tests/
  e2e/create-edit-follow-export.spec.ts
  e2e/mobile-editor.spec.ts
  fixtures/logo-transparent.png
  fixtures/photo-simple.jpg
tasks/
  todo.md                            implementation checklist and review log
  lessons.md                         user-correction lessons
```

---

### Task 1: Application foundation and public shell

**Files:**
- Create: scaffolded Next.js configuration and package files
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/site-header.tsx`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `tasks/todo.md`
- Create: `tasks/lessons.md`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: none
- Produces: working Next.js shell, test commands, global visual tokens, and navigation used by every later task

- [ ] **Step 1: Scaffold the framework and install runtime/test dependencies**

Run from the repository root:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --use-npm --yes
npm install idb jspdf zod lucide-react @vercel/analytics react-easy-crop
npm install --save-dev vitest jsdom @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb @playwright/test @axe-core/playwright
```

If `create-next-app` refuses because `docs/` exists, scaffold into `/private/tmp/crochet-grids-scaffold` with the same flags and copy the generated application files into this repository without overwriting `.git/` or `docs/`.

- [ ] **Step 2: Add test scripts and write the failing landing-page test**

Add scripts `test`, `test:watch`, `test:e2e`, and `typecheck` to `package.json`, then create:

```tsx
import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Home', () => {
  it('presents the crochet-chart value and primary action', () => {
    render(<Home />)

    expect(screen.getByRole('heading', {
      name: /turn any image into a crochet-ready chart/i
    })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create a pattern/i }))
      .toHaveAttribute('href', '/create')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/app/page.test.tsx`

Expected: FAIL because the scaffolded page does not contain the product heading or `/create` action.

- [ ] **Step 4: Build the public shell and visual foundation**

Use a warm fibre-work visual system rather than a generic dashboard: warm paper background, near-black ink, cobalt primary action, coral warning accent, subtle grid lines, rounded-but-not-pill controls, a humanist display face paired with a compact mono face for stitch data. Implement the home page as a Server Component and use `next/link` for the CTA.

The first viewport must include this exact functional content, and phones keep a sticky Create pattern action above the safe-area inset after the hero CTA scrolls away:

```tsx
<h1>Turn any image into a crochet-ready chart</h1>
<p>Convert a logo, graphic or photo into an editable single-crochet motif.</p>
<Link href='/create'>Create a pattern</Link>
```

Create `tasks/todo.md` with one checkbox per plan task and a final `## Review` section. Create `tasks/lessons.md` with the rule: “When the user broadens device support, update the design and test matrix immediately rather than preserving an earlier desktop-first assumption.”

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/app/page.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass and `/` builds as a static route.

Commit:

```bash
git add package.json package-lock.json src vitest.config.ts vitest.setup.ts playwright.config.ts tasks
git commit -m "feat: establish crochet grids app shell"
```

### Task 2: Crochet domain model and row instructions

**Files:**
- Create: `src/features/pattern/model/types.ts`
- Create: `src/features/pattern/model/defaults.ts`
- Create: `src/features/pattern/crochet/instructions.ts`
- Test: `src/features/pattern/crochet/instructions.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `PatternGrid`, `PatternProject`, `PaletteEntry`, `getRowDirection()`, `getRowSide()`, and `getRowRuns()` for editor, follow mode, persistence, and export

- [ ] **Step 1: Define the test-facing domain contract**

Use these exact core types:

```ts
export type Handedness = 'right' | 'left'
export type StartingSide = 'right' | 'left'
export type RowDirection = 'right-to-left' | 'left-to-right'
export type WorkSide = 'right-side' | 'wrong-side'

export interface PaletteEntry {
  id: string
  name: string
  color: string
  symbol: string
}

export interface PatternGrid {
  width: number
  height: number
  cells: Uint8Array
}

export interface RowRun {
  paletteIndex: number
  count: number
}
```

Define `PatternProject` with every field listed in the spec’s Project data section. Store `completedRows` as `number[]` at the persistence boundary and convert it to a `Set<number>` only inside interactive state.

- [ ] **Step 2: Write failing direction and run tests**

```ts
it('reads default right-handed flat rows in alternating directions', () => {
  expect(getRowDirection(1, 'right')).toBe('right-to-left')
  expect(getRowDirection(2, 'right')).toBe('left-to-right')
})

it('compresses runs in the actual working direction', () => {
  const grid = {
    width: 5,
    height: 1,
    cells: Uint8Array.from([0, 0, 1, 1, 1])
  }

  expect(getRowRuns(grid, 1, 'right')).toEqual([
    { paletteIndex: 1, count: 3 },
    { paletteIndex: 0, count: 2 }
  ])
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/crochet/instructions.test.ts`

Expected: FAIL because the instruction functions do not exist.

- [ ] **Step 4: Implement the minimal direction and run logic**

```ts
export function getRowDirection (
  rowNumber: number,
  startingSide: StartingSide
): RowDirection {
  const startsOnRight = startingSide === 'right'
  const isOdd = rowNumber % 2 === 1
  return startsOnRight === isOdd ? 'right-to-left' : 'left-to-right'
}

export function getRowSide (rowNumber: number): WorkSide {
  return rowNumber % 2 === 1 ? 'right-side' : 'wrong-side'
}
```

Implement `getRowRuns(grid, rowNumber, startingSide)` with guard clauses for invalid row numbers. Read row index `rowNumber - 1`; reverse only the traversal order, never mutate `grid.cells`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/pattern/crochet/instructions.test.ts && npm run typecheck`

Expected: PASS.

Commit: `git commit -am "feat: model flat crochet row instructions"`

### Task 3: Grid editing operations and patch history

**Files:**
- Create: `src/features/pattern/grid/operations.ts`
- Create: `src/features/pattern/grid/history.ts`
- Test: `src/features/pattern/grid/operations.test.ts`

**Interfaces:**
- Consumes: `PatternGrid` from Task 2
- Produces: `paintCell()`, `floodFill()`, `replacePaletteIndex()`, `mirrorGrid()`, `applyPatch()`, `undo()`, and `redo()`

- [ ] **Step 1: Write failing immutable-operation tests**

```ts
it('fills only the connected source-colour region', () => {
  const grid = {
    width: 3,
    height: 2,
    cells: Uint8Array.from([0, 0, 1, 0, 1, 1])
  }
  const result = floodFill(grid, 0, 0, 2)

  expect(Array.from(result.grid.cells)).toEqual([2, 2, 1, 2, 1, 1])
  expect(Array.from(grid.cells)).toEqual([0, 0, 1, 0, 1, 1])
})

it('mirrors each row without changing row order', () => {
  const grid = {
    width: 3,
    height: 2,
    cells: Uint8Array.from([0, 1, 2, 3, 4, 5])
  }
  expect(Array.from(mirrorGrid(grid).cells)).toEqual([2, 1, 0, 5, 4, 3])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/grid/operations.test.ts`

Expected: FAIL because operations are undefined.

- [ ] **Step 3: Implement grid patches and operations**

Use this patch contract so history stores changed cells rather than whole grids:

```ts
export interface GridPatch {
  indices: Uint32Array
  before: Uint8Array
  after: Uint8Array
}

export interface GridOperationResult {
  grid: PatternGrid
  patch: GridPatch
}
```

Use an iterative queue for flood fill to avoid recursive stack overflow. Every operation must validate coordinates and palette indexes with guard clauses. `applyPatch()` returns a new `Uint8Array` and does not mutate the input grid.

- [ ] **Step 4: Add bounded undo and redo tests and implementation**

Test that undo restores `before`, redo restores `after`, a new edit clears redo, and history retains at most 100 operations. Implement:

```ts
export interface GridHistory {
  undoStack: GridPatch[]
  redoStack: GridPatch[]
  limit: number
}
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/pattern/grid/operations.test.ts && npm run typecheck`

Commit:

```bash
git add src/features/pattern/grid
git commit -m "feat: add immutable pattern editing operations"
```

### Task 4: Local image conversion and palette reduction

**Files:**
- Create: `src/features/pattern/image/pixels.ts`
- Create: `src/features/pattern/image/quantize.ts`
- Create: `src/features/pattern/image/conversion.worker.ts`
- Create: `src/features/pattern/image/conversion-client.ts`
- Test: `src/features/pattern/image/image.test.ts`

**Interfaces:**
- Consumes: `PatternGrid`, `PaletteEntry`, and limits from Task 2
- Produces: `convertImage(request): Promise<ConversionResult>` returning a grid, generated palette, and prepared preview

- [ ] **Step 1: Define worker messages and write failing pixel tests**

```ts
export interface ConversionRequest {
  id: string
  file: Blob
  width: number
  height: number
  maxColors: number
  background: { name: string, color: string }
  crop: { x: number, y: number, zoom: number }
  brightness: number
  contrast: number
  removeSpeckles: boolean
}

export interface ConversionResult {
  grid: PatternGrid
  palette: PaletteEntry[]
  preview: ImageData
}
```

Test a transparent pixel over `#f5efe3`, contrast clamping, deterministic quantisation, palette limit, and a 2 × 2 synthetic image producing four expected cells.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/image/image.test.ts`

Expected: FAIL because pixel and quantisation functions are missing.

- [ ] **Step 3: Implement pure pixel preparation and deterministic median-cut quantisation**

Implement and export:

```ts
export function compositeBackground (
  rgba: Uint8ClampedArray,
  background: [number, number, number]
): Uint8ClampedArray

export function adjustPixels (
  rgba: Uint8ClampedArray,
  brightness: number,
  contrast: number
): Uint8ClampedArray

export function quantizePixels (
  rgba: Uint8ClampedArray,
  maxColors: number,
  lockedBackground: [number, number, number]
): { colors: Array<[number, number, number]>, indices: Uint8Array }
```

Median-cut boxes split on the channel with the greatest range, then at the median. Sort final colours by luminance for deterministic symbols and snapshots. Reserve palette index `0` for the selected background.

- [ ] **Step 4: Implement the worker boundary and cancellation**

The worker validates 2–12 colours and 1–250 dimensions, decodes with `createImageBitmap`, downsizes sources over 4096 pixels, draws the crop through `OffscreenCanvas`, applies the pure pipeline, and transfers typed-array buffers back. `conversion-client.ts` maintains a `Map` of request IDs and rejects pending work with a typed `ConversionCancelledError` when cancelled.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/pattern/image/image.test.ts
npm run typecheck
npm run lint
```

Commit:

```bash
git add src/features/pattern/image
git commit -m "feat: convert images into local stitch grids"
```

### Task 5: Project setup workflow

**Files:**
- Create: `src/app/create/page.tsx`
- Create: `src/features/pattern/setup/project-setup-form.tsx`
- Create: `src/features/pattern/setup/image-cropper.tsx`
- Create: `src/features/pattern/model/defaults.ts`
- Test: `src/features/pattern/setup/project-setup.test.tsx`

**Interfaces:**
- Consumes: `convertImage()` from Task 4 and project types from Task 2
- Produces: a validated in-memory `PatternProject` and navigation to `/projects/[projectId]`

- [ ] **Step 1: Write failing setup tests**

Cover these exact behaviours:

```ts
it('rejects unsupported images with a recovery message', async () => {
  const user = userEvent.setup()
  render(<ProjectSetupForm convertImage={convertImage} onCreated={onCreated} />)

  await user.upload(screen.getByLabelText(/upload image/i),
    new File(['text'], 'notes.txt', { type: 'text/plain' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Choose a JPG, PNG or WebP image under 20 MB.'
  )
})
```

Also test defaults of 60 stitches, 60 rows, 4 colours, right-handed, start-right, and background index `0`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/setup/project-setup.test.tsx`

- [ ] **Step 3: Build the accessible setup form**

Use Zod to validate file size/type, dimensions, palette range, project name, handedness, and starting side. The cropper uses `react-easy-crop` for touch pan/zoom and returns percentages rather than device pixels. Keep each control labelled and display its validation error next to it.

The submit sequence is explicit: validate → show conversion progress → invoke worker → construct project → call `onCreated(project)` → navigate. On failure, keep the input settings and show `We couldn't convert this image. Try a smaller image or fewer stitches.`

- [ ] **Step 4: Add route loading and cancellation behaviour**

Disable duplicate submission, expose a Cancel action while converting, and restore the form when cancellation resolves. Dynamically import `ProjectSetupForm` from the route so image tooling is absent from the landing bundle.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/pattern/setup/project-setup.test.tsx && npm run typecheck && npm run build`

Commit:

```bash
git add src/app/create src/features/pattern/setup src/features/pattern/model/defaults.ts
git commit -m "feat: add crochet pattern setup flow"
```

### Task 6: Canvas editor, palette, and responsive tools

**Files:**
- Create: `src/app/projects/[projectId]/page.tsx`
- Create: `src/features/pattern/editor/pattern-editor.tsx`
- Create: `src/features/pattern/editor/pattern-canvas.tsx`
- Create: `src/features/pattern/editor/editor-toolbar.tsx`
- Create: `src/features/pattern/editor/palette-panel.tsx`
- Test: `src/features/pattern/editor/editor.test.tsx`
- Test: `tests/e2e/mobile-editor.spec.ts`

**Interfaces:**
- Consumes: grid operations/history from Task 3 and `PatternProject` from Task 2
- Produces: `PatternEditor` with `onProjectChange(project)` and a deterministic canvas render model reused by follow/export

- [ ] **Step 1: Write failing interaction tests**

Test tool selection, cell painting, fill dispatch, undo/redo button state, palette renaming, colour replacement, mirror confirmation, and grid/crochet preview toggle. Mock the canvas context and assert reducer actions rather than implementation-specific draw calls.

```ts
it('renames yarn without changing its colour identity', async () => {
  const user = userEvent.setup()
  render(<PatternEditor project={project} onProjectChange={onChange} />)

  await user.clear(screen.getByLabelText('Yarn name for colour 1'))
  await user.type(screen.getByLabelText('Yarn name for colour 1'), 'Cream cotton')

  expect(onChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      palette: expect.arrayContaining([
        expect.objectContaining({ name: 'Cream cotton', color: '#f5efe3' })
      ])
    })
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/editor/editor.test.tsx`

- [ ] **Step 3: Implement the reducer and canvas rendering**

Keep editing state in `useReducer`. The canvas renderer receives immutable inputs and draws cells, grid lines, every-fifth guide, optional palette symbols, and selected-row emphasis. Convert logical row `0` to visual row `height - 1`.

Pointer rules:

- One pointer with pencil/fill/picker edits
- One pointer with pan tool moves the viewport
- Two pointers always pan/zoom and never paint
- A pointer stroke batches changed cells into one history patch
- `touch-action: none` applies only to the canvas, not the page

Use `requestAnimationFrame` to coalesce paint renders and `ResizeObserver` to resize the backing canvas at device pixel ratio.

- [ ] **Step 4: Build mobile and desktop controls**

Mobile uses a 56-pixel minimum bottom toolbar and bottom sheets for palette/settings. At `md` and above, move palette/settings into a side panel. Memoise `PatternCanvas` and palette rows; define handlers with `useCallback`; do not add state or effects outside the interactive editor boundary.

Add an E2E test at a 390 × 844 viewport that opens tools, paints a cell, pinches or uses zoom controls, opens the palette sheet, and confirms no horizontal page overflow.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/pattern/editor/editor.test.tsx
npx playwright test tests/e2e/mobile-editor.spec.ts
npm run typecheck
```

Commit:

```bash
git add src/app/projects src/features/pattern/editor tests/e2e/mobile-editor.spec.ts
git commit -m "feat: add responsive crochet grid editor"
```

### Task 7: Crochet complexity guidance

**Files:**
- Create: `src/features/pattern/analysis/analyse-pattern.ts`
- Test: `src/features/pattern/analysis/analyse-pattern.test.ts`
- Modify: `src/features/pattern/editor/pattern-editor.tsx`

**Interfaces:**
- Consumes: `PatternGrid` and palette from Task 2
- Produces: `analysePattern(grid, palette): PatternWarning[]`

- [ ] **Step 1: Define warning types and failing tests**

```ts
export interface PatternWarning {
  id: string
  type: 'isolated-cell' | 'many-changes' | 'many-row-colors' |
    'similar-colors' | 'small-detail' | 'large-chart'
  severity: 'info' | 'warning'
  message: string
  rows: number[]
  cellIndices: number[]
}
```

Test that an isolated cell has no orthogonally adjacent same-colour neighbour, a row warns when colour changes exceed 40 percent of its transitions, a row warns above 4 distinct colours, and two palette colours warn when their WCAG contrast ratio is below 1.25.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/analysis/analyse-pattern.test.ts`

- [ ] **Step 3: Implement deterministic analysis**

Each warning ID combines type and sorted location, such as `isolated-cell:42`. Return warnings sorted by first affected row and then type. “Small detail” means a connected non-background component of 1–2 cells. “Large chart” appears when total cells exceed 40,000.

- [ ] **Step 4: Integrate non-blocking guidance**

Run analysis through `useMemo` after project changes. Show a count in the editor and a sheet/panel with messages that focus the relevant row when selected. Never disable export.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/pattern/analysis && npm run typecheck`

Commit: `git commit -am "feat: add crochet complexity guidance"`

### Task 8: IndexedDB persistence and recent projects

**Files:**
- Create: `src/features/pattern/persistence/database.ts`
- Create: `src/features/pattern/persistence/project-repository.ts`
- Test: `src/features/pattern/persistence/project-repository.test.ts`
- Modify: `src/features/pattern/editor/pattern-editor.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: serialisable `PatternProject` from Task 2
- Produces: `saveProject()`, `getProject()`, `listProjects()`, `deleteProject()`, and schema migration

- [ ] **Step 1: Write failing repository tests with fake IndexedDB**

```ts
it('round-trips typed grid data and progress', async () => {
  await saveProject(project)
  const restored = await getProject(project.id)

  expect(restored?.grid.cells).toBeInstanceOf(Uint8Array)
  expect(Array.from(restored?.grid.cells ?? [])).toEqual(Array.from(project.grid.cells))
  expect(restored?.completedRows).toEqual([1, 2])
})
```

Also test newest-first listing, deletion, schema version rejection, and quota failure mapped to `ProjectStorageError`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/persistence/project-repository.test.ts`

- [ ] **Step 3: Implement versioned IndexedDB storage**

Create database `crochet-grids` version `1` with object store `projects`, key path `id`, and `updatedAt` index. Preserve blobs and typed arrays natively. Validate restored records with Zod before returning them. Invalid records remain stored but return a recoverable corruption error instead of crashing the page.

- [ ] **Step 4: Integrate debounced auto-save and recent projects**

Save 750 ms after the last project change, flush on `visibilitychange` when the document becomes hidden, and display `Saving`, `Saved`, or `Not saved` in the editor. The home page recent-project client island lists name, dimensions, updated date, Continue, and Delete. Show a storage warning when persistence is unavailable.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/pattern/persistence
npm test -- src/app/page.test.tsx
npm run typecheck
```

Commit:

```bash
git add src/features/pattern/persistence src/features/pattern/editor src/app/page.tsx
git commit -m "feat: save crochet projects on device"
```

### Task 9: Row-following mode

**Files:**
- Create: `src/features/pattern/follow/follow-mode.tsx`
- Test: `src/features/pattern/follow/follow-mode.test.tsx`
- Modify: `src/features/pattern/editor/pattern-editor.tsx`

**Interfaces:**
- Consumes: `getRowDirection()`, `getRowSide()`, and `getRowRuns()` from Task 2
- Produces: touch-friendly follow mode that updates `currentRow` and `completedRows`

- [ ] **Step 1: Write failing follow-mode tests**

```ts
it('shows row one from the bottom in working direction', () => {
  render(<FollowMode project={project} onProgressChange={onProgressChange} />)

  expect(screen.getByText('Row 1 of 60')).toBeInTheDocument()
  expect(screen.getByText('Right to left')).toBeInTheDocument()
  expect(screen.getByText('Right side')).toBeInTheDocument()
})
```

Also test previous/next boundaries, mark complete, left-start direction, colour-run text, and restoring row 23.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/follow/follow-mode.test.tsx`

- [ ] **Step 3: Implement distraction-free follow mode**

Render the full chart canvas with completed rows dimmed, future rows at reduced opacity, and the current row at full emphasis. Provide large Previous, Complete row, and Next controls, plus a horizontal run list such as `3 Black · 8 Cream`. Include symbols and yarn names; never rely only on swatches.

- [ ] **Step 4: Connect progress to auto-save**

Update project progress through the same editor state path used by Task 8. Exiting follow mode returns to the unchanged editor viewport. Add keyboard support for ArrowUp, ArrowDown, and Space without capturing keys inside form fields.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/pattern/follow && npm run typecheck`

Commit:

```bash
git add src/features/pattern/follow src/features/pattern/editor
git commit -m "feat: add row-by-row crochet follow mode"
```

### Task 10: PNG and printable PDF exports

**Files:**
- Create: `src/features/pattern/export/render-chart.ts`
- Create: `src/features/pattern/export/png-export.ts`
- Create: `src/features/pattern/export/pdf-export.ts`
- Create: `src/lib/download.ts`
- Test: `src/features/pattern/export/export.test.ts`
- Modify: `src/features/pattern/editor/pattern-editor.tsx`

**Interfaces:**
- Consumes: project, grid, palette, and instruction functions from earlier tasks
- Produces: `exportPng(project, options)` and `exportPdf(project, options)` returning downloadable blobs

- [ ] **Step 1: Write failing shared-layout and export tests**

Test a 10 × 10 chart layout, labels every 5 cells, symbol placement, safe filename sanitisation, PNG MIME type, PDF header bytes, legend content, written runs, and multi-page tiling for a 250 × 250 chart.

```ts
it('creates a real PDF blob without mutating the project', async () => {
  const before = structuredClone(project)
  const blob = await exportPdf(project, { includeWrittenRows: true })
  const header = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 4))

  expect(blob.type).toBe('application/pdf')
  expect(header).toBe('%PDF')
  expect(project).toEqual(before)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/pattern/export/export.test.ts`

- [ ] **Step 3: Implement shared chart layout and PNG export**

`render-chart.ts` calculates cells, margins, axes, symbols, arrows, and legend once. PNG uses an offscreen canvas with a minimum 2,000-pixel long edge and exports through `canvas.toBlob`. Options are `grid-only` and `labelled`. Escape project names and use `crochet-chart-<safe-name>.png`.

- [ ] **Step 4: Implement dynamic PDF export and tiled pages**

Import jsPDF inside `exportPdf()` so it is excluded from the initial editor bundle. Use A4 portrait pages, a summary page, vector chart lines, a colour-and-symbol legend, and written rows. Select a tile size that keeps each printed cell at least 3 mm; repeat edge labels and include `Page column X of Y · rows A–B` on each tile.

Render the resulting PDF to images using the PDF skill’s required renderer and visually confirm labels, page boundaries, and grayscale symbols before accepting the task.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/features/pattern/export/export.test.ts
npm run typecheck
npm run build
```

Commit:

```bash
git add src/features/pattern/export src/lib/download.ts src/features/pattern/editor
git commit -m "feat: export printable crochet charts"
```

### Task 11: SEO, legal pages, consent, and release surfaces

**Files:**
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/thank-you/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/icon.svg`
- Create: `src/app/opengraph-image.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/components/consent-banner.tsx`
- Create: `src/components/analytics.tsx`
- Modify: `src/app/layout.tsx`
- Test: `src/components/consent-banner.test.tsx`

**Interfaces:**
- Consumes: public shell from Task 1
- Produces: complete metadata, policies, contact route, consent choice, and analytics boundary

- [ ] **Step 1: Write failing consent and metadata tests**

Test that analytics is absent before consent, Accept stores `crochet-grids-analytics=accepted`, Decline stores `declined`, the choice survives remount, and Settings reopens the banner. Test metadata exports include title and description.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/consent-banner.test.tsx`

- [ ] **Step 3: Implement public release pages**

Create concise privacy and terms pages that state images and projects remain on-device, exports are user-generated, browser storage can be cleared, and contact is `raytheboffin@gmail.com`. Add a simple thank-you page used after the user follows the email-feedback action, with links back to the editor and home. Build a useful 404 with a link home and Create pattern CTA. Generate the Open Graph image with `ImageResponse` so no unoptimised bitmap asset is required.

- [ ] **Step 4: Implement consent-gated analytics and metadata files**

Render `@vercel/analytics/react` only after accepted consent. The consent banner is keyboard operable, does not block essential project storage, and distinguishes analytics from IndexedDB project saving. Add canonical metadata, robots, sitemap, favicon, and page-specific titles/descriptions.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/consent-banner.test.tsx
npm run lint
npm run typecheck
npm run build
```

Commit:

```bash
git add src/app src/components
git commit -m "feat: prepare public release surfaces"
```

### Task 12: End-to-end verification and MVP review

**Files:**
- Create: `tests/e2e/create-edit-follow-export.spec.ts`
- Create: `tests/fixtures/logo-transparent.png`
- Create: `tests/fixtures/photo-simple.jpg`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: complete application
- Produces: verified MVP and documented review results

- [ ] **Step 1: Write the complete failing E2E flow**

The test must:

```ts
test('creates, edits, restores, follows and exports a chart', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Create a pattern' }).click()
  await page.getByLabel('Upload image').setInputFiles('tests/fixtures/logo-transparent.png')
  await page.getByLabel('Stitches').fill('40')
  await page.getByLabel('Rows').fill('32')
  await page.getByRole('button', { name: 'Generate chart' }).click()
  await expect(page.getByText('40 × 32 stitches')).toBeVisible()
  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 1 of 32')).toBeVisible()
})
```

Extend it to paint one cell, rename one yarn, reload and restore, advance one row, download PNG, and download PDF.

- [ ] **Step 2: Run the E2E test to expose integration failures**

Run: `npx playwright test tests/e2e/create-edit-follow-export.spec.ts`

Expected before final fixes: failures identify any mismatched accessible names, persistence timing, or download integration.

- [ ] **Step 3: Fix only failures revealed by verification**

For each failure, record the observed error in `tasks/todo.md`, add the smallest regression assertion at the closest test layer, then apply the minimal fix. Do not expand MVP scope.

- [ ] **Step 4: Run the complete quality gate**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx playwright test
```

Then inspect at 390 × 844, 768 × 1024, and 1440 × 900; run axe checks on home, setup, editor, follow, privacy, and terms; verify no horizontal overflow; verify a 250 × 250 chart remains usable; render one single-page and one tiled PDF; confirm project data and images produce no network requests.

- [ ] **Step 5: Complete the review log and commit**

In `tasks/todo.md`, check every completed task and add a `## Review` section containing test commands, outcomes, known limitations from the spec, and the tested browser/viewports.

Commit:

```bash
git add tests tasks src
git commit -m "test: verify crochet grids MVP workflow"
```

The branch is ready for user review only when the full quality gate passes and the working tree contains no unexplained changes.
