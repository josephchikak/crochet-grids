# Crochet Grids MVP

- [x] Task 1: Application foundation and public shell
- [x] Task 2: Crochet domain model and row instructions
- [x] Task 3: Grid editing operations and patch history
- [x] Task 4: Local image conversion and palette reduction
- [x] Task 5: Project setup workflow
- [x] Task 6: Canvas editor, palette, and responsive tools
- [x] Task 7: Crochet complexity guidance
- [x] Task 8: IndexedDB persistence and recent projects
- [x] Task 9: Row-following mode
- [x] Task 10: PNG and printable PDF exports
- [x] Task 11: SEO, legal pages, consent, and release surfaces
- [x] Task 12: End-to-end verification and MVP review

## Review

### Verified release checks

- `npm test`: unit and component suite
- `npm run lint`: ESLint release check
- `npm run typecheck`: TypeScript release check
- `npm run build`: production Next.js build and route generation
- `npx playwright test tests/e2e/create-edit-follow-export.spec.ts --reporter=line`: upload, convert, edit, save, restore, follow, PNG export and PDF export on desktop and phone
- `npx playwright test tests/e2e/release-quality.spec.ts --reporter=line`: axe checks, horizontal-overflow checks, and 250 × 250 chart operation
- Tested responsive widths: 390 × 844, 768 × 1024 and 1440 × 900
- Verified the large tiled PDF by rendering representative first, middle and final pages
- Verified the complete flow makes no external or mutating network requests; project data and source images remain in the browser

The E2E image is generated deterministically in the test suite instead of storing opaque binary fixtures.

### MVP limitations

- Charts target flat, turned single-crochet motifs rather than rounds, garment construction or shaping
- Projects are stored only in the current browser; there are no accounts, cloud sync or collaboration
- Photos work best when the subject is simple and high-contrast; detailed photos still need manual cleanup
- Yarn colours are user-labelled swatches rather than matches to a commercial yarn catalogue
- Stitch gauge, finished-size calculations and written garment patterns are outside this release
