const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const { parseHTML } = require("linkedom");
const base = path.resolve(__dirname, "../../public");
function storage() {
  const memory = new Map();
  return {
    getItem: (key) => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
}
function boot(page = "index.html", shared = storage()) {
  const url = new URL(page, "http://localhost:4173/");
  const { window, document } = parseHTML(
    fs.readFileSync(path.join(base, url.pathname), "utf8"),
  );
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.focus = function () {};
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { top: 0, height: 0, width: 1000 };
  };
  window.HTMLElement.prototype.reportValidity = function () {
    return [...this.querySelectorAll("[required]")].every((el) =>
      String(el.value || "").trim(),
    );
  };
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      const o =
        this.querySelector("option[selected]") || this.querySelector("option");
      return o?.getAttribute("value") ?? o?.textContent ?? "";
    },
    set(v) {
      for (const o of this.querySelectorAll("option"))
        o.toggleAttribute(
          "selected",
          (o.getAttribute("value") ?? o.textContent) === String(v),
        );
    },
  });
  class FormDataShim {
    constructor(form) {
      this.items = [...form.querySelectorAll("[name]")].map((el) => [
        el.name,
        el.value || "",
      ]);
    }
    entries() {
      return this.items[Symbol.iterator]();
    }
  }
  let destination = null;
  const location = {
    href: url.href,
    search: url.search,
    pathname: url.pathname,
    hash: url.hash,
    assign: (value) => {
      destination = value;
    },
    reload() {
      destination = url.href;
    },
  };
  window.location = location;
  const context = vm.createContext({
    document,
    window,
    Event: window.Event,
    location,
    localStorage: shared,
    Intl,
    Date,
    URL,
    URLSearchParams,
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    FormData: FormDataShim,
  });
  for (const script of document.querySelectorAll("script[src]")) {
    const source = new URL(script.getAttribute("src"), url);
    script.src = source.href;
    vm.runInContext(
      fs.readFileSync(path.join(base, source.pathname), "utf8"),
      context,
      { filename: source.pathname },
    );
  }
  const get = (s) => document.querySelector(s);
  const fire = (node, type) =>
    node.dispatchEvent(
      new window.Event(type, { bubbles: true, cancelable: true }),
    );
  return {
    context,
    document,
    get,
    fire,
    storage: shared,
    click: (s) => fire(get(s), "click"),
    input(s, v) {
      get(s).value = v;
      fire(get(s), "input");
    },
    destination: () => destination,
  };
}
module.exports = { boot, storage, base };
