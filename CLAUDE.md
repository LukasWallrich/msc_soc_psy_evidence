# Project Instructions for Claude

## Main Presentation

The main presentation for this project is a Reveal.js HTML presentation at:
`session_materials/presentation/index.html`

Images used in the presentation are in `session_materials/presentation/images/`.

## Image Cropping

When cropping images to remove unwanted regions (panels, titles, placeholders), use `-chop` not `-crop`:

```bash
# Remove from right edge (e.g., dummy placeholder)
magick image.png -gravity East -chop 600x0 output.png

# Remove from top (e.g., title to be replaced in HTML)
magick image.png -gravity North -chop 0x230 output.png

# Chain multiple chops
magick image.png -gravity East -chop 600x0 -gravity North -chop 0x230 output.png
```

**Why `-chop` over `-crop`:**
- `-chop` removes from a specified edge (via `-gravity`), mapping naturally to "remove the right panel" or "remove the title"
- `-crop` extracts a region, requiring offset calculations
- Chop amounts are directly interpretable (600px from right) vs crop math (2001-600=1401 width)

**Process:**
1. View image, estimate removal amount from relevant edge
2. Single chop command, check result
3. Adjust if needed (usually 1-2 iterations max)
