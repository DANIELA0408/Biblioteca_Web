const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseHTML } = require("linkedom");
const { createServer } = require("../../scripts/serve-frontend.cjs");
const root = path.resolve(__dirname, "../../public");
const files = fs
  .readdirSync(root, { recursive: true })
  .filter((f) => /\.html$/.test(f));
test("all pages have unique dependency order, local links, anchors and assets", () => {
  for (const file of files) {
    const { document } = parseHTML(
      fs.readFileSync(path.join(root, file), "utf8"),
    );
    const scripts = [...document.querySelectorAll("script[src]")].map((n) =>
      path.basename(n.getAttribute("src")),
    );
    assert.equal(
      new Set(scripts).size,
      scripts.length,
      file + " duplicate scripts",
    );
    assert.equal(scripts.indexOf("folio-client.js"), 3);
    assert.equal(scripts.length, 5);
    const ids = [...document.querySelectorAll("[id]")].map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, file + " duplicate IDs");
    for (const node of document.querySelectorAll("[href],[src]")) {
      const value = node.getAttribute("href") || node.getAttribute("src");
      if (/^(https?:|data:|mailto:)/.test(value)) continue;
      const url = new URL(
        value,
        "http://localhost/" + file.replaceAll("\\", "/"),
      );
      const target = path.join(root, decodeURIComponent(url.pathname));
      assert.ok(fs.existsSync(target), file + " -> " + value);
      if (url.hash && url.pathname.endsWith(".html")) {
        const dest = parseHTML(fs.readFileSync(target, "utf8")).document;
        assert.ok(
          dest.getElementById(url.hash.slice(1)),
          file + " -> missing anchor " + value,
        );
      }
    }
  }
  for (const file of fs.readdirSync(path.join(root, "css"))) {
    const css = fs.readFileSync(path.join(root, "css", file), "utf8");
    for (const match of css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) {
      if (/^(data:|https?:|#)/.test(match[1])) continue;
      assert.ok(
        fs.existsSync(path.resolve(root, "css", match[1])),
        file + " -> " + match[1],
      );
    }
  }
});
test("HTTP frontend serves every page/resource and handles missing/invalid paths and methods", async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const file of files) {
      const response = await fetch(base + "/" + file.replaceAll("\\", "/"));
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /<!doctype html>/i);
    }
    for (const file of fs.readdirSync(path.join(root, "js"))) {
      const r = await fetch(base + "/js/" + file);
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-type"), /javascript/);
    }
    assert.equal((await fetch(base + "/missing.html")).status, 404);
    assert.equal(
      (await fetch(base + "/login.html", { method: "POST" })).status,
      405,
    );
    assert.equal((await fetch(base + "/%00")).status, 400);
    assert.equal((await fetch(base + "/%5csecret")).status, 400);
    const head = await fetch(base + "/index.html", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    await new Promise((r) => server.close(r));
  }
});
