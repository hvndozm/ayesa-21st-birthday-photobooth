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