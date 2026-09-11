#!/usr/bin/env python3
"""Local static server with shared params read/write for desktop ↔ phone sync."""
from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.join(ROOT, "dev-params.json")
PORT = 5173


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.end_headers()

    def do_PUT(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path != "/dev-params.json":
            self.send_error(404, "Only /dev-params.json accepts PUT")
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("expected object")
        except Exception as exc:  # noqa: BLE001
            self.send_error(400, "Invalid JSON: %s" % exc)
            return
        cleaned = {}
        replace = bool(data.get("__replace__"))
        for key, value in data.items():
            if key == "__stamp" or str(key).startswith("errormade-"):
                cleaned[key] = value
        if replace:
            existing = dict(cleaned)
        else:
            # Merge into existing file so partial PUTs don't wipe other keys.
            existing = {}
            if os.path.isfile(PARAMS_PATH):
                try:
                    with open(PARAMS_PATH, "r", encoding="utf-8") as handle:
                        prev = json.load(handle)
                    if isinstance(prev, dict):
                        existing = prev
                except Exception:
                    existing = {}
            existing.update(cleaned)
        existing["__stamp"] = str(cleaned.get("__stamp") or existing.get("__stamp") or "")
        existing.pop("__replace__", None)
        with open(PARAMS_PATH, "w", encoding="utf-8") as handle:
            json.dump(existing, handle, indent=2, sort_keys=True, ensure_ascii=False)
            handle.write("\n")
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Keep access logs short
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("ERRORMADE shared-params server on http://0.0.0.0:%s/" % PORT)
    print("Params file: %s" % PARAMS_PATH)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
