#!/usr/bin/env python3
"""Lokaler Server zum Entwickeln.

Wie `python3 -m http.server`, aber der Browser darf nichts zwischenspeichern.
Sonst liefert er nach einer Änderung noch minutenlang die alte Datei aus.

    python3 tools/server.py [port] [ordner]
"""
import functools
import http.server
import sys


class OhneCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    ordner = sys.argv[2] if len(sys.argv) > 2 else '.'
    handler = functools.partial(OhneCache, directory=ordner)
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as server:
        print(f'http://localhost:{port}/  (Ordner: {ordner})')
        server.serve_forever()


if __name__ == '__main__':
    main()
