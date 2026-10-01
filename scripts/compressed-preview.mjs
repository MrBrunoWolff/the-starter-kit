// Local transport simulation: Cloudflare compresses HTML, JS and CSS at the edge.
// Vite's workerd preview serves those responses without production compression.
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
const upstream = process.argv[2];
const port = Number(process.argv[3]);
if (!upstream || !port)
  throw new Error("Usage: node scripts/compressed-preview.mjs http://localhost:4411 4511");
createServer(async (request, response) => {
  try {
    const headers = { ...request.headers, "accept-encoding": "identity" };
    delete headers.host;
    const result = await fetch(new URL(request.url, upstream), { headers, redirect: "manual" });
    const bytes = Buffer.from(await result.arrayBuffer());
    const outgoing = Object.fromEntries(result.headers);
    delete outgoing["content-encoding"];
    delete outgoing["content-length"];
    delete outgoing["transfer-encoding"];
    const compress =
      /(?:text\/|javascript|json|svg)/.test(outgoing["content-type"] ?? "") &&
      /gzip/.test(request.headers["accept-encoding"] ?? "") &&
      bytes.length >= 48;
    if (compress) {
      outgoing["content-encoding"] = "gzip";
      outgoing.vary = "Accept-Encoding";
    }
    response.writeHead(result.status, outgoing);
    response.end(compress ? gzipSync(bytes) : bytes);
  } catch (error) {
    response.writeHead(502);
    response.end(error.message);
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Compressed local production simulation: http://localhost:${port} -> ${upstream}`),
);
