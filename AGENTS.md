# Ayesa's 21st Birthday Photobooth

## Project Overview

This website is a 21st birthday gift for Lyann Ayesa P. Barranta, who may be referred to as Ayesa or Eley.

The website is an interactive online photobooth inspired by modern Korean-style photobooth experiences such as Photoism, Snow Photo, and Old Moon Studio.

The primary audience will use mobile phones, so the website must be designed mobile-first and remain responsive on tablets and desktop computers.

## Technology Stack

Frontend:
- React
- Vite
- JavaScript
- React Router
- Plain CSS

Future backend:
- Supabase
- Supabase PostgreSQL database
- Supabase Authentication
- Supabase Storage

Future deployment:
- GitHub repository
- Vercel or GitHub Pages for the frontend
- Supabase for backend/database/storage

Do not introduce a different framework, backend, CSS framework, state-management library, or major dependency unless explicitly requested.

## Users

There are three user types.

### Guest

Guests do NOT have accounts.

Guests can:
- Open the birthday website
- Start the photobooth
- Choose a photobooth format
- Choose a photostrip design
- Give camera permission
- Take four photographs
- Retake individual photographs
- Generate a final photostrip
- Download the finished photostrip as PNG
- Send a birthday message to Ayesa using a nickname

Guests must never be able to browse other guests' photographs or messages.

### Ayesa

Ayesa will have a private login.

Ayesa will eventually be able to:
- Read birthday messages
- View the photobooth gallery
- Download completed photostrips
- Log out

### Admin

The admin will have a separate private dashboard.

The admin will eventually be able to:
- Upload PNG photostrip designs
- Assign designs to photobooth formats
- Enable or disable designs
- Delete designs
- View submitted messages
- View photobooth images
- Download images

## Photobooth Formats

The website supports exactly three formats.

### Template 1
- 2 x 6 inches
- Vertical photostrip
- Four vertically stacked photo frames
- Target final PNG resolution: 600 x 1800 px

### Template 2
- 6 x 4 inches
- Landscape layout
- Four photographs arranged in a 2 x 2 grid
- Target final PNG resolution: 1800 x 1200 px

### Template 3
- 4 x 6 inches
- Portrait layout
- Four photographs arranged in a 2 x 2 grid
- Target final PNG resolution: 1200 x 1800 px

Each design will eventually be a transparent PNG overlay uploaded by the administrator.

## Future Photobooth Workflow

The intended workflow is:

Home
→ Welcome popup
→ Start Photobooth
→ Choose Format
→ Choose Design
→ Request Camera Permission
→ Capture Photo 1
→ Capture Photo 2
→ Capture Photo 3
→ Capture Photo 4
→ Allow retakes
→ Confirm
→ Generate final PNG with Canvas
→ Save final photostrip
→ Show result
→ Download PNG / Take Another / Home

Only the final composed photostrip should eventually be uploaded to the backend by default, not all four raw camera photographs.

## Birthday Messages

Guests will eventually be able to submit:
- Nickname
- Birthday message / letter

The message will be visible only to Ayesa and the admin.

## Visual Direction

The UI should feel:
- Cute
- Soft
- Playful
- Birthday themed
- Photobooth inspired
- Pastel
- Polished
- Mobile friendly

Suggested visual motifs:
- Pastel pink
- Cream / white
- Lavender
- Hearts
- Bows
- Stars
- Clouds
- Cakes
- Cameras
- Sparkles
- Rounded cards

The aesthetic may be inspired by cute Japanese/Korean character styling, but do not include copyrighted Sanrio character artwork or logos in the base project.

Use generic original decorative elements and placeholders until custom images are provided later.

Animations should be subtle and purposeful.

Examples:
- Modal entrance
- Floating decorative shapes
- Button tap effects
- Soft page transitions
- Countdown
- Camera flash
- Photo frame animation
- Confetti after completing a photostrip
- Heart animation after sending a message

Avoid excessive animation.

## Development Principles

- Design mobile-first.
- Keep components reasonably small.
- Prefer reusable components.
- Keep code readable for a college-level developer.
- Use descriptive variable and function names.
- Do not unnecessarily over-engineer the application.
- Do not add TypeScript.
- Do not add Tailwind CSS.
- Do not add a backend until explicitly requested.
- Do not add Supabase until explicitly requested.
- Do not implement authentication until explicitly requested.
- Do not implement camera functionality until explicitly requested.
- Never hardcode passwords, API keys, Supabase service keys, or other secrets.
- Environment secrets must eventually use .env files.
- Do not commit .env files to Git.

## Development Strategy

Build the application incrementally.

Do not attempt to implement the entire website in one task.

Current milestone:
Phase 1 — frontend foundation and public landing experience.

Later milestones will separately implement:
- Photobooth selection
- Camera capture
- Canvas image generation
- Backend
- Messages
- Authentication
- Ayesa dashboard
- Admin dashboard
- Deployment

## Phase 10 Design and Filter Architecture

### Built-in Designs

The existing four built-in designs must remain permanently supported:

- Sweet Bow
- Birthday Sparkle
- Lavender Dream
- Love Letter

Do not remove, replace, upload, or migrate these built-in designs to Supabase.

They continue using the existing local configuration, capture-preview styling, and Canvas rendering system.

### Custom Designs

Admin-uploaded transparent PNG designs are an additional design source.

The public design catalog is:

Built-in designs
+
Active custom Supabase designs

Custom designs use:

- public.photostrip_designs
- private template-designs Storage bucket

Support up to 4 custom designs per photobooth format.

Therefore each format may contain:

- 4 built-in designs
- up to 4 custom designs

for up to 8 selectable designs per format.

A custom design is format-specific.

Required custom PNG dimensions:

- 2x6: 600 x 1800 px
- 6x4: 1800 x 1200 px
- 4x6: 1200 x 1800 px

The photo windows in uploaded templates must be transparent and align exactly with the centralized frame coordinates.

### Filter Step

The photobooth workflow now includes a Filter step after capturing all four photographs and before the final Result.

Updated workflow:

Home
→ Format
→ Design
→ Camera
→ Capture 4 Photos
→ Filter
→ Result
→ Download PNG

Available filters:

- original
- blurry
- digicam
- polaroid
- mono

The user selects ONE filter for the entire photostrip.

The selected filter applies to all four photographs consistently.

The filter must NOT alter the photostrip template artwork or decorative overlay.

The Filter page must show an accurate preview of the final photostrip before the user proceeds to Result.

The final Result must visually match the selected Filter preview.

Filter processing must use browser-side Canvas and must not upload raw photographs or send images to an external image-processing service.

### Current Milestone

Phase 10 — Hybrid built-in/custom templates, real PNG overlays, and photostrip filters.

## Current Milestone

Phase 11 — Production readiness, deployment, security review,
real-device testing, and final launch.

Do not introduce major new features during this phase unless
required to fix a production-blocking bug.

Production hosting:
- Frontend: Vercel
- Repository: GitHub
- Backend/Auth/Database/Storage: Supabase

## Optional Camera Timer

The photobooth camera normally captures immediately when the shutter is pressed.

The user may optionally enable a 5-second timer.

Timer OFF:
- Shutter captures immediately.
- This remains the default behavior.

Timer ON:
- Pressing the shutter starts a 5-second countdown.
- Show 5, 4, 3, 2, 1.
- Capture immediately after the countdown.
- The captured photo is inserted into the active frame.
- The live camera then moves to the next empty frame as usual.

The timer applies to both normal captures and individual retakes.

The timer is a user-controlled camera option. Do not automatically enable it based on the selected template.

The camera must preserve:
- live photostrip composition
- built-in designs
- custom PNG overlays
- front/rear camera switching
- mock camera
- mirroring
- retakes
- four-frame progression

Countdown UI should appear over the active camera frame without hiding the rest of the photostrip.

## Post-Launch UI Refinement

### Countdown Timer Placement
The optional 5-second timer must remain supported, but the countdown overlay must not block the user’s face or most of the live camera view.

Preferred behavior:
- Do not place the large countdown number in the center of the active camera frame.
- Keep the live composition visible while counting down.
- Countdown should appear in a less obstructive position, such as:
  - above the photostrip,
  - near the top or bottom edge of the active frame,
  - or as a floating badge positioned outside the main facial area.
- The countdown must still be clear and readable.
- Preserve timer ON/OFF behavior, retakes, and real/mock camera compatibility.

### Refined Visual Direction
The site should keep its cute birthday identity, but the visual language should now evolve into a balanced hybrid of:

- soft, cute, pastel, Sanrio-like charm
- and
- the stylish, slightly edgy, rock-feminine mood inspired by Nana (2006)

Important:
- Do not use direct copyrighted characters, logos, title art, or exact branded graphics.
- Do not directly reproduce Vivienne Westwood logos/orbs.
- Instead, capture the mood through original design language.

Desired blend:
- still soft, sweet, and birthday-themed
- but with touches of:
  - black accents
  - seven-star motifs
  - plaid/tartan hints
  - lace / ribbon contrasts
  - editorial / punk-girly styling
  - elegant serif + stylish accent typography
  - slightly darker contrast details

The result must NOT become too dark or lose the celebratory birthday feel.

The visual tone should feel like:
“cute birthday photobooth meets stylish early-2000s shoujo rock fashion.”

Preserve usability, readability, and mobile friendliness.

## Final Visual Direction — Cute × Nana-Inspired

The previous pastel-only redesign was too subtle.

The website should now have an unmistakable hybrid visual identity:

1. Cute, soft birthday / Sanrio-like charm
2. Early-2000s Japanese punk/shoujo-rock fashion inspired by Nana (2006)

The Nana-inspired influence must be visible through actual recurring decorative motifs and layout treatments, not merely darker colors.

### Key visual motifs

Use original interpretations of:

- strawberry-shaped glasses
- Room 707 plaques / number motifs
- lotus flowers
- seven-star arrangements
- black stars
- red stars
- punk-band flyer/poster graphics
- microphone / guitar / music motifs
- chains
- pearls
- safety pins
- padlocks
- lace
- tartan / plaid
- torn paper
- distressed stickers
- black ribbon
- lipstick red details
- handwritten notes
- fashion-magazine/editorial labels
- original orb/crown-inspired punk jewelry motifs

Do not directly reproduce official:
- Nana anime/manga artwork
- Nana title logos
- Black Stones/BLAST official logos
- Vivienne Westwood trademarks/logos
- Seven Stars cigarette branding
- Sanrio characters/logos

Original references and visual equivalents are preferred.

### Balance

The UI must NOT become predominantly black.

Use roughly:

- 65–75% light / cream / blush / soft pink surfaces
- 15–25% black / charcoal / deep plum structural accents
- 5–10% red / berry / silver statement accents

The birthday website should still feel romantic, cute, warm, and usable.

Target mood:

“Sanrio sweetness meets Room 707 punk romance.”

The edgy motifs should feel like scrapbook memorabilia, fashion-editorial decorations, stickers, concert flyers, jewelry, and bedroom-wall details rather than a generic dark theme.