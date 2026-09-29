#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_dir="$project_dir/.runtime"
server_pid_file="$runtime_dir/server.pid"
browser_pid_file="$runtime_dir/browser.pid"
browser_profile="$runtime_dir/browser-profile"
port="${ZHANAMI_PORT:-5173}"
url="http://127.0.0.1:$port/"

owned_process() {
  local pid="$1" marker="$2" command_line
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  command_line="$(ps -p "$pid" -o args= 2>/dev/null || true)"
  [[ -n "$command_line" && "$command_line" == *"$marker"* ]]
}

read_pid() {
  [[ -f "$1" ]] && cat "$1" || true
}

stop_process() {
  local pid_file="$1" marker="$2" pid
  pid="$(read_pid "$pid_file")"
  if [[ -n "$pid" ]] && owned_process "$pid" "$marker"; then
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
}

start() {
  mkdir -p "$runtime_dir"
  if [[ ! -x "$project_dir/node_modules/.bin/vite" ]]; then
    echo "Dependencies are missing. Run: make setup" >&2
    exit 1
  fi

  local pid
  pid="$(read_pid "$server_pid_file")"
  if [[ -z "$pid" ]] || ! owned_process "$pid" "$project_dir/node_modules/.bin/vite"; then
    rm -f "$server_pid_file"
    setsid "$project_dir/node_modules/.bin/vite" --host 127.0.0.1 --port "$port" --strictPort \
      >>"$runtime_dir/server.log" 2>&1 </dev/null &
    echo "$!" > "$server_pid_file"
    for _ in $(seq 1 40); do
      if curl -fsS -o /dev/null "$url" 2>/dev/null; then break; fi
      sleep .2
    done
    if ! owned_process "$(read_pid "$server_pid_file")" "$project_dir/node_modules/.bin/vite" || ! curl -fsS -o /dev/null "$url" 2>/dev/null; then
      stop_process "$server_pid_file" "$project_dir/node_modules/.bin/vite"
      echo "Preview server did not start. See $runtime_dir/server.log" >&2
      exit 1
    fi
  fi

  echo "Preview: $url"

  if [[ -z "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]]; then
    echo "No desktop display detected; open the URL in a browser to view it."
    return
  fi

  pid="$(read_pid "$browser_pid_file")"
  if [[ -n "$pid" ]] && owned_process "$pid" "$browser_profile"; then
    echo "Preview window is already open."
    return
  fi

  local browser=""
  for candidate in google-chrome chromium chromium-browser; do
    if command -v "$candidate" >/dev/null 2>&1; then browser="$candidate"; break; fi
  done
  if [[ -z "$browser" ]]; then
    echo "No Chrome or Chromium found; open the URL in a browser to view it."
    return
  fi

  rm -f "$browser_pid_file"
  setsid "$browser" --user-data-dir="$browser_profile" --app="$url" --new-window \
    --no-first-run --no-default-browser-check >>"$runtime_dir/browser.log" 2>&1 </dev/null &
  echo "$!" > "$browser_pid_file"
  echo "Opened a dedicated preview window."
}

stop() {
  stop_process "$browser_pid_file" "$browser_profile"
  stop_process "$server_pid_file" "$project_dir/node_modules/.bin/vite"
  echo "Zhanami preview stopped."
}

status() {
  local server_pid browser_pid
  server_pid="$(read_pid "$server_pid_file")"
  browser_pid="$(read_pid "$browser_pid_file")"
  if [[ -n "$server_pid" ]] && owned_process "$server_pid" "$project_dir/node_modules/.bin/vite"; then
    echo "Server running at $url (PID $server_pid)"
  else
    echo "Server stopped"
  fi
  if [[ -n "$browser_pid" ]] && owned_process "$browser_pid" "$browser_profile"; then
    echo "Preview window running (PID $browser_pid)"
  else
    echo "Preview window stopped"
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|status}" >&2; exit 2 ;;
esac
