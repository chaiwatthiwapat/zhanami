# Themes and assets

Sakura is the default theme. Moonlight is a second token set that demonstrates how a theme can change without copying the layout. Click **Settings** in the application grid to switch between them during preview.

## Add a theme

1. Add a wallpaper file under `public/assets/wallpapers/` if the theme needs one.
2. Add a `:root[data-theme='name']` block to `src/themes.css` with `--w`, `--card`, `--dark`, `--ln`, `--pk`, `--pk2`, and `--dim`.
3. Add the theme name to the state and selection logic in `src/App.tsx`.

The `--w` token is a CSS `url(...)`. It is used for the page wallpaper and as the fallback cropped music cover, matching the original HTML when live cover art is unavailable. The default wallpaper is `public/assets/wallpapers/wall_01.webp`, copied from `/home/znnn/Pictures/design/wall_01.webp`.

Keep wallpaper filenames descriptive and add future images to the same directory. Avoid embedding large Base64 image data in CSS or TSX so assets remain replaceable and cacheable.

The SVG files under `public/assets/icons/` preserve the app icon shapes from the supplied HTML concept. Add new icons there and reference them by filename from `Shell.tsx`.
