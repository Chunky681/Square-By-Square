#!/usr/bin/env python3
import argparse
import csv
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT_DIR = Path(__file__).resolve().parent
PLAYERS_CSV_PATH = ROOT_DIR / "data" / "players.csv"

CSV_FIELDS = [
    "id",
    "xpBank",
    "voidBank",
    "azureBank",
    "amberBank",
    "bestTime",
    "totalKills",
    "wins",
    "marathonCheckpointDistance",
    "marathonCheckpointX",
    "marathonCheckpointY",
    "nextItemId",
    "upgrades",
    "items",
]

PLAYER_FILE_LOCK = threading.Lock()


def ensure_players_file():
    PLAYERS_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    if PLAYERS_CSV_PATH.exists() and PLAYERS_CSV_PATH.stat().st_size > 0:
        return

    with PLAYERS_CSV_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()


def coerce_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def parse_json(value, default):
    if value is None:
        return default

    raw = str(value).strip()
    if not raw:
        return default

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return default

    return parsed


def row_to_player(row):
    player_id = str(row.get("id", "")).strip().lower()
    if not player_id:
        return None

    upgrades = parse_json(row.get("upgrades"), {})
    if not isinstance(upgrades, dict):
        upgrades = {}

    items = parse_json(row.get("items"), [])
    if not isinstance(items, list):
        items = []

    return {
        "id": player_id,
        "xpBank": coerce_int(row.get("xpBank"), 0),
        "voidBank": coerce_int(row.get("voidBank"), 0),
        "azureBank": coerce_int(row.get("azureBank"), 0),
        "amberBank": coerce_int(row.get("amberBank"), 0),
        "bestTime": coerce_int(row.get("bestTime"), 0),
        "totalKills": coerce_int(row.get("totalKills"), 0),
        "wins": coerce_int(row.get("wins"), 0),
        "marathonCheckpointDistance": coerce_int(row.get("marathonCheckpointDistance"), 0),
        "marathonCheckpointX": coerce_int(row.get("marathonCheckpointX"), coerce_int(row.get("marathonCheckpointDistance"), 0)),
        "marathonCheckpointY": coerce_int(row.get("marathonCheckpointY"), 0),
        "nextItemId": coerce_int(row.get("nextItemId"), 2),
        "upgrades": upgrades,
        "items": items,
    }


def player_to_row(player):
    player_id = str(player.get("id", "")).strip().lower()
    upgrades = player.get("upgrades", {})
    items = player.get("items", [])

    if not isinstance(upgrades, dict):
        upgrades = {}
    if not isinstance(items, list):
        items = []

    return {
        "id": player_id,
        "xpBank": coerce_int(player.get("xpBank"), 0),
        "voidBank": coerce_int(player.get("voidBank"), 0),
        "azureBank": coerce_int(player.get("azureBank"), 0),
        "amberBank": coerce_int(player.get("amberBank"), 0),
        "bestTime": coerce_int(player.get("bestTime"), 0),
        "totalKills": coerce_int(player.get("totalKills"), 0),
        "wins": coerce_int(player.get("wins"), 0),
        "marathonCheckpointDistance": coerce_int(player.get("marathonCheckpointDistance"), 0),
        "marathonCheckpointX": coerce_int(player.get("marathonCheckpointX"), coerce_int(player.get("marathonCheckpointDistance"), 0)),
        "marathonCheckpointY": coerce_int(player.get("marathonCheckpointY"), 0),
        "nextItemId": coerce_int(player.get("nextItemId"), 2),
        "upgrades": json.dumps(upgrades, separators=(",", ":"), ensure_ascii=True),
        "items": json.dumps(items, separators=(",", ":"), ensure_ascii=True),
    }


def read_players():
    ensure_players_file()
    players = {}
    with PLAYERS_CSV_PATH.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            player = row_to_player(row)
            if not player:
                continue
            players[player["id"]] = player
    return players


def write_players(players):
    ensure_players_file()
    with PLAYERS_CSV_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for player_id in sorted(players.keys()):
            writer.writerow(player_to_row(players[player_id]))


class RiftRunRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/player/"):
            self.handle_get_player(parsed.path)
            return
        super().do_GET()

    def do_PUT(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/player/"):
            self.handle_put_player(parsed.path)
            return
        self.send_error(404, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/player/"):
            self.handle_put_player(parsed.path)
            return
        self.send_error(404, "Not found")

    def handle_get_player(self, path):
        player_id = self.extract_player_id(path)
        if not player_id:
            self.send_json(400, {"error": "Player ID is required."})
            return

        with PLAYER_FILE_LOCK:
            players = read_players()
            player = players.get(player_id)

        self.send_json(200, {"player": player})

    def handle_put_player(self, path):
        player_id = self.extract_player_id(path)
        if not player_id:
            self.send_json(400, {"error": "Player ID is required."})
            return

        payload = self.read_json_body()
        if payload is None:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        player = payload.get("player")
        if not isinstance(player, dict):
            self.send_json(400, {"error": "Body must contain a `player` object."})
            return

        player = dict(player)
        player["id"] = player_id

        with PLAYER_FILE_LOCK:
            players = read_players()
            players[player_id] = player
            write_players(players)

        self.send_json(200, {"ok": True, "id": player_id})

    def extract_player_id(self, path):
        prefix = "/api/player/"
        raw = unquote(path[len(prefix):]) if path.startswith(prefix) else ""
        player_id = raw.strip().lower()
        return player_id or None

    def read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None

        if content_length <= 0:
            return {}

        raw_body = self.rfile.read(content_length)
        try:
            decoded = raw_body.decode("utf-8")
            return json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser(description="Rift Run local server")
    parser.add_argument("--port", type=int, default=8080, help="HTTP port (default: 8080)")
    parser.add_argument("--host", default="127.0.0.1", help="Host bind address (default: 127.0.0.1)")
    args = parser.parse_args()

    ensure_players_file()

    def handler_factory(*handler_args, **handler_kwargs):
        return RiftRunRequestHandler(*handler_args, directory=str(ROOT_DIR), **handler_kwargs)

    server = ThreadingHTTPServer((args.host, args.port), handler_factory)
    print(f"Serving Rift Run at http://{args.host}:{args.port}")
    print(f"Player data file: {PLAYERS_CSV_PATH}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
