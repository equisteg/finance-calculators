#!/usr/bin/env node
/**
 * Zero-dependency static file server for the apps/mobile export.
 *
 *   node scripts/serve-static.mjs <root> <port>
 *
 * apps/mobile sets `output: "export"` (next.config.ts), so `next start` refuses
 * to serve it -- the build emits a plain `out/` directory that Capacitor loads
 * from webDir. This serves that same directory over HTTP so Playwright drives
 * byte-for-byte what the APK ships, without pulling in another dependency.
 *
 * Honours `trailingSlash: true` by resolving /foo/ -> out/foo/index.html.
 */

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, normalize, extname, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 3101);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

/** Resolves a URL path to a file on disk, or null. */
async function resolveFile(urlPath) {
  // Block traversal outside the export root.
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, safe);
  if (!base.startsWith(root)) return null;

  const candidates = base.endsWith("/") || base.endsWith("\\")
    ? [join(base, "index.html")]
    : [base, `${base}.html`, join(base, "index.html")];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const urlPath = (req.url ?? "/").split("?")[0];
  const file = await resolveFile(urlPath);

  if (!file) {
    // Fall back to the export's own 404 page when it exists.
    const notFound = await resolveFile("/404.html");
    if (notFound) {
      res.writeHead(404, { "content-type": MIME[".html"] });
      createReadStream(notFound).pipe(res);
      return;
    }
    res.writeHead(404, { "content-type": MIME[".txt"] });
    res.end("404 Not Found");
    return;
  }

  res.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`[serve-static] ${root} -> http://127.0.0.1:${port}`);
});
