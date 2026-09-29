# Search keyboard shortcuts

The centered search palette opens with **Super+O** while the preview browser has focus. **Super+I** remains a fallback because Super+O is already used by the current desktop. The Search buttons in the dock and top bar also open it. Every opener focuses the search input. **Super+Q** closes only the search palette; it does not close launched applications. Browser shortcuts cannot work outside the focused preview window, and the desktop may intercept Super combinations.

The palette filters the seven locally launchable apps: Files, Chrome, zter, VS Code, Discord, Spotify, and Photos. It does not search files or the web.

## Search and results

- In Standard mode, typing starts immediately. In Vim mode, the palette opens in Insert mode.
- `Enter` with one match opens that app. With multiple matches, it focuses the result list. With no matches, it does nothing.
- In the result list, use `j`/`k` in Vim mode or `↑`/`↓` in Standard mode, then `Enter` to open the selected app. Selection stops at the first and last items. Only the selected app is highlighted; a stationary pointer does not override keyboard selection, while moving the pointer selects the app under it.
- `Esc` from the result list returns to the query with its text and cursor position preserved. In Vim mode it returns to Normal; in Standard mode it returns to the input.
- `Esc` from Vim Insert enters Normal. `i` from Vim Normal enters Insert at the cursor. In Standard mode, `Esc` from the input closes the palette.

## Vim Normal mode

The highlighted character in the input is the Vim cursor. Commands edit a single-line query.

| Keys | Action |
| --- | --- |
| `h` / `l` | Move one character left / right. |
| `w` / `b` | Move to the next / previous word. |
| `0` / `$` | Move to the first / last character. |
| `i` / `a` | Enter Insert before / after the cursor. |
| `A` (Shift+A) | Move to the end of the query and enter Insert. |
| `ciw` | Remove the word under the cursor and enter Insert. |
| `x` | Delete the character under the cursor. |
| `yiw` | Copy the word under the cursor to the palette's unnamed register. |
| `p` / `P` | Paste the register after / before the cursor. |
| `C` (Shift+C) | Remove text from the cursor to the end and enter Insert. |
| `dd` | Copy the whole query to the register, then clear it. |
| `u` | Undo the most recent query edit or Insert session. |

The footer shows a status tag on the left: `--INSERT--`, `--NORMAL--`, `--RESULTS--`, or `--SEARCH--` in Standard mode. A partial Vim command appears as plain text on the right while waiting for keys such as `ciw` or `dd` and expires after 1.8 seconds. The register and undo history last only while that palette is open. The Standard/Vim preference is stored in the browser profile under `zhanami.searchMode.v1`.
