import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, sep } from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("./index.html", import.meta.url));
const assets = await realpath(fileURLToPath(new URL("./assets/", import.meta.url)));
const host = "127.0.0.1";
const port = Number(process.argv[2] || 4173);
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".mp3", "audio/mpeg"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
]);

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) && start <= end ? { start, end } : null;
}

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const isEntry = pathname === "/" || pathname === "/index.html";
    if (!isEntry && !pathname.startsWith("/assets/")) {
      response.writeHead(404).end();
      return;
    }
    const file = await realpath(isEntry ? entry : join(assets, pathname.slice("/assets/".length)));
    const type = mime.get(extname(file));
    const publicPath = isEntry ? file === entry : file.startsWith(assets + sep);
    if (!publicPath || !type) {
      response.writeHead(404).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end();
      return;
    }

    const range = request.headers.range && byteRange(request.headers.range, info.size);
    if (request.headers.range && !range) {
      response.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end();
      return;
    }

    const { start, end } = range || { start: 0, end: info.size - 1 };
    response.setHeader("Content-Type", type);
    response.setHeader("Content-Length", end - start + 1);
    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (range) response.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
    response.writeHead(range ? 206 : 200);
    if (request.method === "HEAD" || info.size === 0) {
      response.end();
    } else {
      pipeline(createReadStream(file, { start, end }), response, () => {});
    }
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404).end();
  }
}).listen(port, host, () => console.log(`http://${host}:${port}`));
