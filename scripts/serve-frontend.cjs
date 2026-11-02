const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "../public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
function createServer() {
  return http.createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    try {
      let pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (pathname.includes("\0") || pathname.includes("\\"))
        throw new Error("Invalid path");
      if (pathname.endsWith("/")) pathname += "index.html";
      const file = path.resolve(root, "." + pathname),
        relative = path.relative(root, file);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const data = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      response.writeHead(
        error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 400,
        { "Content-Type": "text/plain; charset=utf-8" },
      );
      response.end("Página no disponible");
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.FRONTEND_PORT || 4173);
  const server = createServer();
  server.listen(port, "127.0.0.1", () =>
    console.log(`FOLIO frontend: http://127.0.0.1:${port}`),
  );
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { createServer };
