# Visual revision — birthday sweetness and Room 707 punk romance

The revision adds a visible visual identity through original memorabilia and
compositions. The successful countdown above the photostrip is preserved.

## Design tokens

The cream, paper, blush, lavender, charcoal/plum, berry, secondary text, and focus
colors from the previous refinement remain. This revision adds:

- `--red: #9b2638` for concert labels and small statement details.
- `--silver: #a7a3ad` and related neutral shades for fashion accessories.
- `--tartan` for stronger original cream/rose/charcoal plaid paper, tape, and trims.

The layout stays predominantly light. Typography combines existing readable
system sans-serif controls and Georgia headings with bold concert-flyer labels,
numbered track labels, and italic stationery captions. No font download is needed.

## Reusable original artwork

`src/components/StudioMotif.jsx` supplies eight decorative variants:

| Motif | Appearance and use |
| --- | --- |
| Strawberry glasses | Two pointed berry-red lenses, green leaves, cream seeds, dark bridge/frame; hero, messages, Filter, private memory room |
| Seven stars | Seven stars in an asymmetric arrangement, mixed charcoal/red/silver; shared headings, dividers, footer |
| Room 707 tag | Key-tag shape with ring-hole, number, and red rule; hero, camera, private mastheads/login |
| Lotus | Original elegant line art; invitation heading, stationery, Result, private letters/gallery |
| Chain | Linked silver line and tiny lock; desktop hero and memory-story accessories |
| Safety pin | Small silver line art; paper corners, camera controls, Admin details |
| Ticket | Torn/perforated birthday-session stub; homepage keepsakes |
| Record | Original dark vinyl and pink star label; Filter sleeve |

`StudioSignature.jsx` reuses the Room 707/seven-star identity in a compact label
row. Decorations have `aria-hidden`, ignore pointer events, and never enter the
Canvas renderer. All artwork is local SVG/CSS; no official art, logos, hotlinked
images, tobacco props, or external assets were added.

## Page compositions

- **Homepage:** layered LIVE birthday flyer, visible strawberry-glasses sticker,
  dark 707 key tag, tartan paper, Polaroid/strip, torn ticket, black ribbon,
  silver pin/chain, and lotus. Invitation cards have taped corners/accessory
  stickers; the memory pair becomes a scrapbook panel. Original hero text and
  CTAs remain.
- **Format and Design:** numbered ticket cards with perforated divisions; taped
  design sleeves and tiny 707 labels occupy the outer card, away from template
  previews. Actual designs and PNG artwork are unchanged.
- **Camera:** compact LIVE/STUDIO masthead, 707 tag, tartan trim, and small
  seven-star/pin detail near controls. The camera stays dominant. Countdown
  placement, reserved height, number size, and all timer behavior are retained.
- **Filter:** a record-sleeve header and numbered 01–05 tracklist around the same
  clearly named filters; selected checks remain. Strawberry accessories sit
  below the generated preview, outside the PNG.
- **Result:** concert-keepsake ticket, lotus, seven stars, and italic caption
  beside/below the generated PNG. Download remains the strongest action.
- **Messages and Login:** lotus stationery, recognizable glasses/bow stickers,
  torn tartan tape, lace, and room-tag accessories around readable forms.
- **Ayesa:** a private memory-room masthead, strawberry glasses and 707 key tag,
  lotus/bow welcome, stationery letters, and taped scrapbook gallery cards.
- **Admin:** compact control-room masthead, 707 detail, silver pin, stars, and
  tartan labels. Management/upload controls remain practical and clear.

## Responsive and accessibility treatment

Mobile retains the primary signature motifs. Secondary hero chain, lotus, and
pin decorations are hidden below 600px, with smaller ticket lettering. Additional
private/Filter ornaments hide on narrow phones; signatures and labels wrap.
Decorations sit outside controls and template previews. Existing focus rings,
contrasting form boundaries, semantic labels/selected states, tap targets, and
global reduced-motion behavior are retained. No new animation was added.

## Files

New: `StudioMotif.jsx`, `StudioSignature.jsx`, `styles/motifs.css`,
`styles/scrapbook.css`, and this report.

Updated: shared Site/Booth layouts; Home, Camera, Filter, Result, Messages, and
PrivateLogin presentation; Ayesa layout/overview/messages/gallery; Admin
layout/overview; shared and page CSS. The unchanged private inbox/gallery/design
components receive the identity through their parent layouts and scoped styles.

Existing backend services, schemas, RLS, Storage, authentication, routes, camera
hooks/capture/timer utilities, filter processing, Canvas geometry/rendering, and
gallery-saving logic were preserved. The prior `CaptureComposition.jsx` timer
fix and its tests were not reverted. The user's `AGENTS.md` changes remain intact.

## Verification

- Production build: passed using `npm.cmd run build`.
- Existing tests: **178 passed, 0 failed** using `npm.cmd test`.
- Lint: exit 0, with the same three existing React warnings in
  `usePhotostripGallerySave.js:18`, `usePhotoSession.js:25`, and
  `CameraPage.jsx:47` (the import added a line; the warned statement is unchanged).
- Homepage mobile/desktop screenshots visually reviewed: the new flyer,
  strawberry glasses, 707 tag, stronger tartan, ticket, and jewelry are visible
  while cream/pink surfaces and cute photo memorabilia remain dominant.
- Browser widths: **320, 375, 390, 430, 768, and 1440px**. Public pages,
  Camera, Filter, Result, message form/success, and login layouts fit without
  horizontal overflow or runtime/console errors.
- Full mock flow passed: default Off immediate capture; visible 5, 4, 3, 2, 1
  above the print; one capture; competing controls disabled; cancellation and
  timed retake preserve photos; all five filters; exact Filter/Result/download
  PNG identity. Birthday message validation/success used an in-memory fixture.
- Production synthetic-media checks passed **72 responsive measurements**, with
  all three output dimensions, front/rear orientation, unobstructed timer, and
  exact Filter/Result PNG identity preserved.
- Custom-overlay browser checks passed for all three formats at all six widths:
  centralized preview coordinates aligned within 0.2%; Mono changed photo pixels
  while original colored artwork margins stayed byte-identical.
- Populated private/message/login checks passed **102 page/dialog measurements**
  across all six widths, including read/unread letters, loaded gallery images,
  long names, all template formats, and letter/memory/template/upload/delete
  dialogs. No overflow or runtime/console errors; measured controls were at least
  44px. No external requests were made by those fixtures.
- Final production route/accessibility checks passed **29 assertions**: exclusive
  format selection, built-in design continuation, invalid-selection recovery,
  guest redirects for all seven private routes, welcome focus/Tab/Escape,
  decorative `aria-hidden`, and reduced-motion behavior.
- Final homepage, Camera, Filter, Result, Ayesa, Admin, message, and login
  screenshots were inspected. The UI has visible recurring original music/
  fashion/scrapbook motifs while retaining dominant light birthday surfaces.

Screenshots and JSON receipts are stored locally in ignored
`dist/visual-revision/`. Temporary browser/server/fixture helpers are removed
after collecting the artifacts; they are not part of application source.

Browser checks use isolated local data/media fixtures, without live Supabase
reads or writes. Physical-phone camera permissions/switching and authenticated
production data still require a real-device check. The detailed manual checklist
in `docs/post-launch-refinement.md` remains applicable; include 768px and 1440px
when reviewing this revision.
