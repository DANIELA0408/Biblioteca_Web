const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict");
const { parseHTML } = require("linkedom");
const base = require("path").resolve(__dirname, "../../public") + "/";
function boot(page = "libros.html") {
  const { window, document } = parseHTML(
    fs.readFileSync(base + "admin/" + page, "utf8"),
  );
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.focus = function () {};
  window.HTMLElement.prototype.reportValidity = function () {
    return [...this.querySelectorAll("[required]")].every(
      (input) => String(input.value || "").trim() !== "",
    );
  };
  Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
    configurable: true,
    get() {
      const option =
        this.querySelector("option[selected]") || this.querySelector("option");
      return option?.getAttribute("value") ?? option?.textContent ?? "";
    },
    set(value) {
      for (const option of this.querySelectorAll("option")) {
        if (
          (option.getAttribute("value") ?? option.textContent) === String(value)
        )
          option.setAttribute("selected", "");
        else option.removeAttribute("selected");
      }
    },
  });
  class FormDataShim {
    constructor(form) {
      this.items = [
        ...form.querySelectorAll("input[name],textarea[name],select[name]"),
      ]
        .filter((el) => !el.hasAttribute("disabled"))
        .map((el) => [el.getAttribute("name"), el.value || ""]);
    }
    entries() {
      return this.items[Symbol.iterator]();
    }
  }
  const memory = new Map(),
    storage = {
      getItem: (k) => memory.get(k) || null,
      setItem: (k, v) => memory.set(k, v),
    };
  const context = vm.createContext({
    document,
    window,
    location: { hash: "", pathname: "/admin/" + page },
    localStorage: storage,
    Intl,
    Date,
    FormData: FormDataShim,
    URLSearchParams,
    FolioClient: {
      requireRole: () => ({ id: 6, rol: "admin" }),
      userCredentials: async () => ({ demo_password_hash: "test" }),
    },
  });
  for (const file of ["libros-data.js", "prestamos-data.js", "admin-model.js"])
    vm.runInContext(fs.readFileSync(base + "js/" + file, "utf8"), context);
  const originalCreate = context.FolioAdminModel.create;
  context.FolioAdminModel.create = (options) =>
    originalCreate({ today: () => "2026-10-31", ...options });
  vm.runInContext(fs.readFileSync(base + "js/admin.js", "utf8"), context);
  const get = (selector) => {
    const node = document.querySelector(selector);
    assert.ok(node, "Missing element " + selector);
    return node;
  };
  const fire = (node, type) =>
    node.dispatchEvent(
      new window.Event(type, { bubbles: true, cancelable: true }),
    );
  const click = (selector) => fire(get(selector), "click");
  const input = (selector, value) => {
    get(selector).value = value;
    fire(get(selector), "input");
  };
  const submit = async () => {
    fire(get("#admin-editor form"), "submit");
    await new Promise((r) => setImmediate(r));
  };
  const database = () => JSON.parse(memory.get("folio.admin.demo.v1"));
  return { document, get, fire, click, input, submit, database };
}
(async () => {
  const app = boot();
  const view = () => app.get("#folio-admin").dataset.view;
  assert.equal(view(), "books");
  assert.equal(
    app.document.querySelectorAll(".admin-table tbody tr").length,
    10,
  );
  app.click("#admin-new");
  app.input("[name=titulo]", "Test interfaz");
  app.input("[name=autor]", "Autor de prueba");
  app.input("[name=categoria]", "Historia");
  app.input("[name=cantidad]", "3");
  assert.match(app.get("#admin-editor-cover").textContent, /Test interfaz/);
  await app.submit();
  assert.equal(app.get("#admin-editor").hidden, true);
  assert.match(app.get("#admin-notice-text").textContent, /añadido/);
  assert.equal(app.database().books.length, 31);
  assert.match(app.get("#admin-table-area").textContent, /Test interfaz/);
  app.click("[data-admin-view=users]");
  assert.equal(view(), "users");
  app.click("#admin-new");
  app.input("[name=nombre]", "Usuario de prueba");
  app.input("[name=email]", "LUCIA@EXAMPLE.COM");
  app.input("[name=password]", "Prueba123!");
  await app.submit();
  assert.equal(app.get("#admin-editor").hidden, false);
  assert.match(app.get("#admin-notice-text").textContent, /Ya existe/);
  assert.equal(app.get("[name=nombre]").value, "Usuario de prueba");
  app.input("[name=email]", "interfaz@example.com");
  await app.submit();
  assert.equal(app.database().users.length, 7);
  app.click("[data-admin-view=loans]");
  assert.equal(view(), "loans");
  app.input("#admin-query", "B2D8E410");
  app.click('[data-action=review-loan][data-id="102"]');
  app.click("[data-action=approve-loan]");
  assert.equal(
    app.database().loans.find((l) => l.id === 102).estado,
    "prestado",
  );
  assert.equal(app.database().books.find((b) => b.id === 2).cantidad, 1);
  app.click('[data-action=review-loan][data-id="102"]');
  await app.submit();
  assert.equal(
    app.database().loans.find((l) => l.id === 102).estado,
    "devuelto",
  );
  assert.equal(app.database().books.find((b) => b.id === 2).cantidad, 2);
  app.click("#admin-undo");
  assert.equal(
    app.database().loans.find((l) => l.id === 102).estado,
    "prestado",
  );
  assert.equal(app.database().books.find((b) => b.id === 2).cantidad, 1);
  app.click("#admin-undo");
  assert.equal(
    app.database().loans.find((l) => l.id === 102).estado,
    "pendiente",
  );
  app.click("[data-admin-view=books]");
  app.click('[data-action=edit-book][data-id="1"]');
  app.input("[name=titulo]", "Cambio sin guardar");
  app.click("[data-admin-view=users]");
  assert.equal(view(), "books");
  assert.match(app.get("#admin-notice-text").textContent, /sin guardar/);
  app.click("[data-action=stay]");
  assert.equal(app.get("[name=titulo]").value, "Cambio sin guardar");
  app.click("[data-admin-view=loans]");
  app.click("[data-action=discard]");
  assert.equal(view(), "loans");
  assert.equal(
    app.database().books.find((b) => b.id === 1).titulo,
    "La metamorfosis",
  );
  app.input("#admin-query", "A1D9E320");
  app.click('[data-action=review-loan][data-id="202"]');
  assert.ok(app.get("[data-action=approve-loan]").hasAttribute("disabled"));
  app.click("[data-action=close-editor]");
  app.click("[data-admin-view=books]");
  app.input("#admin-query", "Test interfaz");
  app.click('[data-action=delete-book][data-id="31"]');
  app.click("[data-action=confirm-delete]");
  assert.ok(!app.database().books.some((b) => b.id === 31));
  app.click("#admin-undo");
  assert.ok(app.database().books.some((b) => b.id === 31));
  app.click("[data-admin-view=users]");
  app.input("#admin-query", "admin@example.com");
  app.click('[data-action=delete-user][data-id="6"]');
  assert.match(app.get("#admin-editor").textContent, /propia cuenta/);
  assert.equal(
    app.document.querySelector("[data-action=confirm-delete]"),
    null,
  );
  app.click("[data-action=close-editor]");
  app.click("[data-action=reset-demo]");
  app.click("[data-action=confirm-reset]");
  assert.equal(app.database().books.length, 30);
  assert.equal(app.database().users.length, 6);
  assert.equal(
    boot("prestamos.html").get("#folio-admin").dataset.view,
    "loans",
  );
  assert.equal(boot("usuarios.html").get("#folio-admin").dataset.view, "users");
  console.log(
    "PASS: DOM real simulado: menús, tres rutas, formularios, validación sin perder datos, portada viva, aprobación/devolución, deshacer, cambios sin guardar, inventario agotado, eliminación, último administrador y reinicio.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
