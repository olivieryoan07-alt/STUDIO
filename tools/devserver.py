#!/usr/bin/env python3
"""Serveur de developpement : sert le dossier du projet SANS cache.

Sans ca, le navigateur garde les modules ES en cache HTTP et la page de tests
execute du code perime — ce qui a fait croire a trois echecs persistants le
2026-11-16 alors que les corrections etaient bien sur le disque.
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
