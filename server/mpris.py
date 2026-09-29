#!/usr/bin/python3
"""Read and control the active MPRIS player on the local session bus."""

import json
import sys
from urllib.parse import urlparse

from gi.repository import Gio, GLib


PREFIX = "org.mpris.MediaPlayer2."
OBJECT = "/org/mpris/MediaPlayer2"
PLAYER = "org.mpris.MediaPlayer2.Player"
PROPERTIES = "org.freedesktop.DBus.Properties"
FLAGS = Gio.DBusCallFlags.NONE


def call(bus, name, interface, method, parameters=None, result_type=None):
    return bus.call_sync(
        name, OBJECT, interface, method, parameters, result_type, FLAGS, 1000, None
    )


def names(bus):
    result = bus.call_sync(
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
        "ListNames",
        None,
        GLib.VariantType("(as)"),
        FLAGS,
        1000,
        None,
    )
    return sorted(name for name in result.unpack()[0] if name.startswith(PREFIX))


def properties(bus, name):
    result = call(
        bus,
        name,
        PROPERTIES,
        "GetAll",
        GLib.Variant("(s)", (PLAYER,)),
        GLib.VariantType("(a{sv})"),
    )
    return result.unpack()[0]


def active_player(bus):
    candidates = []
    for name in names(bus):
        try:
            props = properties(bus, name)
        except GLib.Error:
            continue
        status = props.get("PlaybackStatus", "Stopped")
        metadata = props.get("Metadata", {})
        if status not in ("Playing", "Paused"):
            continue
        score = (2 if status == "Playing" else 1, bool(metadata.get("xesam:title")))
        candidates.append((score, name, props))

    return max(candidates, default=None, key=lambda item: item[0])


def safe_art_url(value):
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    return value if parsed.scheme in ("http", "https") else None


def snapshot(bus):
    selected = active_player(bus)
    if not selected:
        return None

    _, name, props = selected
    metadata = props.get("Metadata", {})
    artists = metadata.get("xesam:artist", [])
    artist = ", ".join(item for item in artists if isinstance(item, str))
    length = metadata.get("mpris:length")
    position = props.get("Position", 0)
    return {
        "playerId": name,
        "playerName": name[len(PREFIX):].split(".instance", 1)[0].title(),
        "title": str(metadata.get("xesam:title") or "Unknown media"),
        "artist": artist,
        "artUrl": safe_art_url(metadata.get("mpris:artUrl")),
        "playbackStatus": props.get("PlaybackStatus", "Stopped"),
        "positionSeconds": max(0, int(position)) / 1_000_000,
        "lengthSeconds": max(0, int(length)) / 1_000_000 if isinstance(length, int) and length > 0 else None,
        "rate": float(props.get("Rate", 1.0)),
        "canPlayPause": bool(props.get("CanControl")) and bool(
            props.get("CanPause") if props.get("PlaybackStatus") == "Playing" else props.get("CanPlay")
        ),
        "canGoPrevious": bool(props.get("CanControl")) and bool(props.get("CanGoPrevious")),
        "canGoNext": bool(props.get("CanControl")) and bool(props.get("CanGoNext")),
        "canSeek": bool(props.get("CanControl")) and bool(props.get("CanSeek")) and bool(metadata.get("mpris:trackid")) and isinstance(length, int) and length > 0,
    }


def control(bus, player_id, action, value=None):
    selected = active_player(bus)
    if not selected or selected[1] != player_id:
        return {"ok": False, "reason": "Player changed"}

    _, name, props = selected
    if not props.get("CanControl"):
        return {"ok": False, "reason": "Control unavailable"}

    capability = {
        "playPause": bool(
            props.get("CanPause") if props.get("PlaybackStatus") == "Playing" else props.get("CanPlay")
        ),
        "previous": bool(props.get("CanGoPrevious")),
        "next": bool(props.get("CanGoNext")),
        "seek": bool(props.get("CanSeek")),
    }
    if action not in capability or not capability[action]:
        return {"ok": False, "reason": "Action unavailable"}

    if action == "seek":
        metadata = props.get("Metadata", {})
        track_id = metadata.get("mpris:trackid")
        length = metadata.get("mpris:length")
        if not track_id or not isinstance(length, int) or length <= 0 or value is None:
            return {"ok": False, "reason": "Seeking unavailable"}
        position = min(length, max(0, int(float(value) * 1_000_000)))
        call(bus, name, PLAYER, "SetPosition", GLib.Variant("(ox)", (track_id, position)))
    else:
        method = {"playPause": "PlayPause", "previous": "Previous", "next": "Next"}[action]
        call(bus, name, PLAYER, method)

    return {"ok": True}


def main():
    bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
    if len(sys.argv) == 2 and sys.argv[1] == "status":
        result = snapshot(bus)
    elif len(sys.argv) >= 4 and sys.argv[1] == "control":
        result = control(bus, sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
    else:
        raise ValueError("Usage: mpris.py status | control PLAYER ACTION [SECONDS]")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (GLib.Error, ValueError, TypeError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(1)
