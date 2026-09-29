# Architecture

Zhanami is a browser preview of a desktop concept. It does not install a dock, replace the GNOME Shell, or change the Ubuntu wallpaper.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Stage scaling, current time, theme state, search shortcut, and toast messages. |
| `src/components/Shell.tsx` | Top bar, dock, application grid, search, and bottom controls. |
| `src/components/Widgets.tsx` | Clock/weather, music, system rings, tasks, and calendar. |
| `server/systemMetrics.ts` | Reads local CPU, memory, and root filesystem metrics for the preview. |
| `server/mpris.py` | Reads and controls the active media player over the local MPRIS D-Bus interface. |
| `server/mpris.ts` | Runs the MPRIS helper from the Vite preview server. |
| `src/types/system.ts` | Shared shape of the system metrics response. |
| `src/types/media.ts` | Shared media snapshot and control command types. |
| `src/layout.css` | Geometry and glass styling migrated from `desktop_01.html`. |
| `src/themes.css` | Theme tokens and component overrides. |
| `public/assets/wallpapers/` | Wallpaper files. |
| `public/assets/icons/` | SVG app icons extracted from the HTML concept. |
| `scripts/preview.sh` | Lifecycle of the Vite server and optional dedicated browser window. |

## Rendering model

The reference design is a 1600 × 900 canvas. `App.tsx` scales the entire stage to fit the current viewport while preserving its aspect ratio. The wallpaper fills the page with CSS `cover`, so it may crop at different display ratios. Component positions remain in stage coordinates to preserve the original composition.

React owns all interactive state. The clock reads the local time. Workspace selection, task completion, calendar navigation, and theme selection are local preview interactions. Weather and battery values are samples. The system rings poll `/api/system` every 2.5 seconds for live CPU utilization, available memory, and usage of the root filesystem (`/`). App buttons show a preview message; they do not launch desktop applications. Search shows a preview message; it does not query files or the web.

The music card polls `/api/media` for the active MPRIS player. The local Python helper reads the session D-Bus and prefers playing media over paused media. It returns the title, artist, optional cover art, playback state, position, duration, and available controls. Play/pause, previous, next, and seeking send commands only when the player advertises support. Unsupported controls keep their original appearance and do nothing. Shuffle, repeat, and the heart are visual only. If no player is active or the MPRIS helper is unavailable, the card shows its original sample content without simulating playback. Artwork is displayed only when the player provides an HTTP(S) URL; otherwise the wallpaper crop remains as the cover.

These local endpoints exist on the Vite preview server. A static production build needs its own local system and media adapters.

The captions below the rings show the CPU model, total RAM, and used/total root disk space. GB values use decimal units. RAM usage excludes memory the kernel reports as available. Disk used, total, and percentage follow the root filesystem figures from `df`; the percentage accounts for filesystem blocks reserved from ordinary users. Captions that exceed their slots pan slowly to the end and back; short captions stay still. Hovering exposes the full text in the native tooltip. Reduced-motion settings disable the animation.

## Boundaries for later integration

The UI components receive callbacks or own preview state. A later desktop integration can replace sample data and preview callbacks with adapters while keeping the visual components. GNOME Shell integration would be a separate extension or service; this React preview does not depend on GNOME APIs.
