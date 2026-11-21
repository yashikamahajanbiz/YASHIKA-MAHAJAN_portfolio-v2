#!/usr/bin/env python3
"""Preview server that behaves like the real host.

`python3 -m http.server` works and is all you need to look at the site, but it
sends everything uncompressed. globe.gl.js is 1.8 MB raw and 511 KB gzipped —
on a phone that is the difference between nine seconds and two and a half.

This serves the same folder with gzip on, so what you measure locally is what
she will actually get.

    python3 tools/serve.py [port]        default 8000

Whatever you deploy to MUST compress text assets. Every CDN does by default;
check it rather than assume it.
"""

import gzip
import io
import os
import sys
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)

COMPRESS = {
    ".js", ".css", ".html", ".json", ".svg", ".map", ".txt",
}
# already compressed — gzipping these wastes cycles and gains nothing
IMMUTABLE = {".webp", ".jpg", ".jpeg", ".png", ".mp4", ".m4v", ".woff2"}


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        ext = os.path.splitext(self.path.split("?")[0])[1].lower()
        if ext in IMMUTABLE:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif ext in {".json", ".html", ""}:
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        ext = os.path.splitext(path)[1].lower()
        accepts = "gzip" in self.headers.get("Accept-Encoding", "")
        if ext not in COMPRESS or not accepts or not os.path.isfile(path):
            return super().send_head()

        try:
            with open(path, "rb") as fh:
                raw = fh.read()
        except OSError:
            self.send_error(404, "File not found")
            return None

        buf = io.BytesIO()
        with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=9, mtime=0) as gz:
            gz.write(raw)
        body = buf.getvalue()

        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Vary", "Accept-Encoding")
        self.end_headers()
        return io.BytesIO(body)

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(Handler, directory=os.path.abspath(ROOT))
    # keep-alive plus a single thread deadlocks a browser's parallel connections
    srv = ThreadingHTTPServer(("", port), handler)
    print(f"VIVEKTA on http://localhost:{port}  (gzip on, like the real host)")
    print("Ctrl-C to stop")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
