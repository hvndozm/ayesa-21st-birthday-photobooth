# Birthday images

The homepage uses these local photographs, configured in `src/pages/HomePage.jsx`:

- `Main.jfif`: large hero portrait.
- `strip1.jfif` through `strip4.jfif`: hero photostrip, from top to bottom.
- `lower1.jfif`: left memory photo.
- `lower2.jfif`: right memory photo.

JFIF files are imported with `?url` so Vite handles them as static image assets.
Keep filename capitalization consistent when replacing files for deployment.

Photo frames set the display aspect ratio; images use `object-fit: cover` to
preserve their proportions while filling the frame. This crops edges when needed
and leaves the original files untouched. Memory photos load lazily below the hero.
