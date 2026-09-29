# Zhanami

React + TypeScript desktop preview based on `desktop_01.html` and `wall_01.webp`.

## Setup

Requires Node.js 22.12+ and npm. Chrome or Chromium is optional for a dedicated preview window. Live media controls use the local D-Bus session through `/usr/bin/python3` with PyGObject (`python3-gi` on Ubuntu); without it, the original music card remains as a visual placeholder.

```bash
cd /home/znnn/my_code/zhanami
make setup
```

## Run

```bash
make preview   # start the local preview and open its window when available
make status    # show preview process status
make stop      # close the dedicated window and stop the local server
```

The preview URL is `http://127.0.0.1:5173/`. If no graphical display or supported browser is available, `make preview` starts the server and prints the URL. Set `ZHANAMI_PORT` to use another port.

With a desktop session running, the Files, Chrome, zter, VS Code, Discord, and Spotify icons open the corresponding local apps. The Photos icon opens `~/Pictures` in Files. The other icons remain visual previews.

The Today card starts empty. Use `+` to add a task, the circle to mark it complete, and the pencil or `×` beside a task to edit or delete it. Enter saves an edit; Escape cancels it. Tasks are stored in the preview browser's local storage and remain there until deleted. They are specific to that browser profile and are not synced or backed up.

## Build

```bash
make build
make lint
```

Architecture and theme notes are in [`docs/`](docs/architecture.md).
