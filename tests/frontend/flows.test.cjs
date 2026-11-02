const test = require("node:test");
const assert = require("node:assert/strict");
const { boot, storage } = require("./harness.cjs");
const db = (s) => JSON.parse(s.getItem("folio.admin.demo.v1"));
const tick = () => new Promise((r) => setImmediate(r));

test("full reader/admin cycle shares stock, request, approval, return and history", async () => {
  const s = storage();
  let app = boot("index.html", s),
    client = app.context.FolioClient;
  assert.equal(app.document.querySelectorAll("[data-book]").length, 4);
  await client.register({
    nombre: "Flujo de prueba",
    email: "flujo@example.com",
    password: "Prueba123!",
  });
  const userId = client.session().id;
  app = boot("libros.html?libro=4", s);
  app.click('[data-request="4"]');
  const loan = db(s).loans.at(-1);
  assert.equal(loan.estado, "pendiente");
  assert.match(loan.codigo, /^[A-F0-9]{8}$/);
  assert.match(app.destination(), /prestamos.html\?prestamo=/);
  assert.equal(db(s).books.find((b) => b.id === 4).cantidad, 4);
  assert.throws(() => app.context.FolioClient.requestLoan(4), /Ya tienes/);
  app = boot("prestamos.html?prestamo=" + loan.id, s);
  assert.equal(app.get("#loan-record-status").textContent, "Pendiente");
  assert.equal(app.get("#loan-record-email").textContent, "flujo@example.com");
  // Switching accounts must not overwrite the library database.
  await app.context.FolioClient.login("admin@example.com", "Demo123!");
  app = boot("admin/prestamos.html", s);
  app.input("#admin-query", loan.codigo);
  app.click(`[data-action=review-loan][data-id="${loan.id}"]`);
  app.click("[data-action=approve-loan]");
  assert.equal(db(s).loans.at(-1).estado, "prestado");
  assert.equal(db(s).books.find((b) => b.id === 4).cantidad, 3);
  await app.context.FolioClient.login("flujo@example.com", "Prueba123!");
  app = boot("prestamos.html?prestamo=" + loan.id, s);
  assert.equal(app.get("#loan-record-status").textContent, "Prestado");
  await app.context.FolioClient.login("admin@example.com", "Demo123!");
  app = boot("admin/prestamos.html", s);
  app.input("#admin-query", loan.codigo);
  app.click(`[data-action=review-loan][data-id="${loan.id}"]`);
  app.fire(app.get("form[data-admin-form=return]"), "submit");
  assert.equal(db(s).loans.at(-1).estado, "devuelto");
  assert.equal(db(s).books.find((b) => b.id === 4).cantidad, 4);
  await app.context.FolioClient.login("flujo@example.com", "Prueba123!");
  app = boot("prestamos.html?prestamo=" + loan.id, s);
  assert.equal(app.get("#loan-record-status").textContent, "Devuelto");
  assert.ok(app.get("#loan-record-date").textContent);
  assert.equal(db(s).loans.at(-1).usuario_id, userId);
  assert.equal(app.context.FolioClient.myLoans().length, 1);
});

test("auth validation, identity, safe returns, private routes, logout, expiry and foreign loans", async () => {
  const s = storage();
  let app = boot("prestamos.html", s);
  assert.match(app.destination(), /login.html\?volver=/);
  app = boot("admin/usuarios.html", s);
  assert.match(app.destination(), /login.html/);
  app = boot("registro.html", s);
  assert.equal(app.get("#folio-name-field").hidden, false);
  const client = app.context.FolioClient;
  await assert.rejects(
    client.login("lector@example.com", "incorrecta"),
    /incorrectos/,
  );
  await assert.rejects(
    client.register({
      nombre: "X",
      email: "lector@example.com",
      password: "123456",
    }),
    /Ya existe/,
  );
  await assert.rejects(
    client.register({ nombre: "X", email: "mal", password: "123456" }),
    /válido/,
  );
  await assert.rejects(
    client.register({ nombre: "X", email: "x@example.com", password: "123" }),
    /6 a 72/,
  );
  await client.login(" LECTOR@EXAMPLE.COM ", "Demo123!");
  assert.deepEqual(Object.keys(client.session()).sort(), [
    "email",
    "id",
    "nombre",
    "rol",
  ]);
  app = boot("admin/libros.html", s);
  assert.match(app.destination(), /prestamos.html$/);
  app = boot("prestamos.html?prestamo=201", s);
  assert.match(app.get("#folio-flow-message").textContent, /no pertenece/);
  app = boot("libros.html?libro=999999", s);
  assert.match(app.get("#folio-flow-message").textContent, /ya no está/);
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "../secret",
    "admin/../../secret",
  ])
    assert.equal(client.safeReturn(value), "libros.html");
  assert.equal(
    client.safeReturn("libros.html?libro=4&token=secret"),
    "libros.html?libro=4",
  );
  app = boot("prestamos.html", s);
  app.click("nav button");
  assert.equal(client.session(), null);
  assert.match(app.destination(), /login.html$/);
  s.setItem(
    "folio.session.demo.v1",
    JSON.stringify({ usuario_id: 1, expires: 1 }),
  );
  assert.equal(client.session(), null);
  s.setItem("folio.session.demo.v1", "{broken");
  assert.equal(client.session(), null);
  await client.login("admin@example.com", "Demo123!");
  app = boot("prestamos.html", s);
  assert.match(app.destination(), /admin\/libros.html/);
});

test("catalog pagination, categories, search, stock, existing request and admin/public synchronization", async () => {
  const s = storage();
  let app = boot("libros.html", s);
  assert.equal(app.document.querySelectorAll("[data-book]").length, 20);
  assert.equal(app.get("#catalog-prev").disabled, true);
  app.click("#catalog-next");
  assert.equal(app.document.querySelectorAll("[data-book]").length, 10);
  assert.equal(app.get("#catalog-next").disabled, true);
  app.input("#catalog-query", "HABITACION");
  assert.equal(app.document.querySelectorAll("[data-book]").length, 1);
  app.input("#catalog-query", "NO EXISTE");
  assert.equal(app.get("#catalog-empty").hidden, false);
  app.click("[data-action=reset]");
  assert.equal(app.document.querySelectorAll("[data-book]").length, 20);
  app = boot("libros.html?libro=3", s);
  assert.equal(app.get("#detail-request button").disabled, true);
  await app.context.FolioClient.login("lector@example.com", "Demo123!");
  app = boot("libros.html?libro=2", s);
  assert.match(app.get("#detail-request a").href, /prestamo=102/);
  assert.throws(
    () => app.context.FolioClient.requestLoan(3),
    /no tiene ejemplares/,
  );
  await app.context.FolioClient.login("admin@example.com", "Demo123!");
  app = boot("admin/libros.html", s);
  const model = app.context.FolioClient.model();
  model.saveBook(null, {
    titulo: "Prueba de ciencia",
    autor: "Prueba",
    categoria: "Ciencia",
    cantidad: 2,
  });
  app = boot("libros.html?categoria=Ciencia", s);
  assert.equal(app.document.querySelectorAll("[data-book]").length, 1);
  assert.match(app.get(".catalog-categories").textContent, /Ciencia/);
  assert.match(app.get("#catalog-sections").textContent, /Prueba de ciencia/);
  app = boot("index.html", s);
  assert.ok(!app.get("#folio-panel"));
  assert.match(app.get("#folio-account").textContent, /Administración/);
});

test("all three illumination states and keyboard/click accessible loan detail/back", async () => {
  const s = storage();
  let app = boot("login.html", s);
  for (const [value, greeting] of [
    ["morning", "Buenos días."],
    ["afternoon", "Buenas tardes."],
    ["night", "Buenas noches."],
  ]) {
    app.get("#folio-light-mode").value = value;
    app.fire(app.get("#folio-light-mode"), "change");
    assert.equal(app.get("#folio-day-greeting").textContent, greeting);
  }
  app.click("#folio-show-password");
  assert.equal(app.get("#folio-access-password").type, "text");
  app.click("#folio-show-password");
  assert.equal(app.get("#folio-access-password").type, "password");
  await app.context.FolioClient.login("lector@example.com", "Demo123!");
  app = boot("prestamos.html", s);
  assert.equal(app.document.querySelectorAll("[data-loan]").length, 5);
  for (const [state, count] of [
    ["pendiente", 1],
    ["prestado", 3],
    ["devuelto", 1],
    ["", 5],
  ]) {
    app.click(`[data-status="${state}"]`);
    assert.equal(app.document.querySelectorAll("[data-loan]").length, count);
  }
  app.click('[data-loan="101"]');
  assert.equal(app.get("#loans-detail-view").hidden, false);
  app.click("[data-action=back]");
  assert.equal(app.get("#loans-table-view").hidden, false);
  for (const value of ["morning", "afternoon", "night"]) {
    app.get("#loans-light").value = value;
    app.fire(app.get("#loans-light"), "change");
    assert.equal(app.get("#folio-loans-page").dataset.light, value);
  }
});

test("stale demo tabs re-read inventory; undo cannot erase changes from another tab", async () => {
  const s = storage();
  const app = boot("login.html", s);
  await app.context.FolioClient.login("admin@example.com", "Demo123!");
  const create = app.context.FolioClient.model;
  const first = create(),
    second = create();
  first.approveLoan(102);
  assert.throws(() => second.approveLoan(102), /pendientes/);
  assert.equal(db(s).books.find((b) => b.id === 2).cantidad, 1);
  second.saveBook(null, {
    titulo: "Otra pestaña",
    autor: "Autor",
    categoria: "Ensayo",
    cantidad: 1,
  });
  assert.throws(() => first.undo(), /No hay cambios/);
  assert.ok(db(s).books.some((b) => b.titulo === "Otra pestaña"));
  const guarded = app.context.FolioAdminModel.create({ activeUserId: 6 });
  assert.throws(
    () =>
      guarded.saveUser(6, {
        nombre: "Admin",
        email: "admin@example.com",
        rol: "usuario",
      }),
    /propio rol/,
  );
  const admin = boot("admin/libros.html", s);
  admin.click("#admin-new");
  admin.input("[name=titulo]", "Sin guardar");
  admin.click("nav button");
  assert.match(admin.get("#admin-notice-text").textContent, /sin guardar/);
  assert.ok(admin.context.FolioClient.session());
  admin.click("[data-action=stay]");
  assert.ok(admin.get("[name=titulo]"));
  admin.click("nav button");
  admin.click("[data-action=discard]");
  assert.equal(admin.context.FolioClient.session(), null);
  assert.match(admin.destination(), /login.html$/);
});

test("storage failures do not report successful registration or request", async () => {
  const s = storage();
  const app = boot("login.html", s);
  await app.context.FolioClient.login("lector@example.com", "Demo123!");
  s.setItem = () => {
    throw new Error("QuotaExceeded");
  };
  assert.throws(
    () => app.context.FolioClient.requestLoan(4),
    /No se pudo guardar/,
  );
  await assert.rejects(
    app.context.FolioClient.register({
      nombre: "Sin espacio",
      email: "espacio@example.com",
      password: "123456",
    }),
    /No se pudo guardar/,
  );
});

test("registration and login actual submit handlers, busy state and errors", async () => {
  const s = storage();
  let app = boot("registro.html", s);
  app.input("#folio-access-name", "Registro UI");
  app.input("#folio-access-email", "registro@example.com");
  app.input("#folio-access-password", "Prueba123!");
  app.fire(app.get("#folio-access-form"), "submit");
  assert.equal(app.get("[type=submit]").disabled, true);
  for (let i = 0; i < 20 && !app.destination(); i++) await tick();
  assert.match(app.destination(), /prestamos.html/);
  app = boot("login.html?volver=libros.html%3Flibro%3D4", s);
  app.input("#folio-access-email", "registro@example.com");
  app.input("#folio-access-password", "incorrecta");
  app.fire(app.get("#folio-access-form"), "submit");
  for (let i = 0; i < 20 && app.get("[type=submit]").disabled; i++)
    await tick();
  assert.match(app.get("#folio-access-status").textContent, /incorrectos/);
  assert.equal(app.get("[type=submit]").disabled, false);
  app.input("#folio-access-password", "Prueba123!");
  app.fire(app.get("#folio-access-form"), "submit");
  for (let i = 0; i < 20 && !app.destination(); i++) await tick();
  assert.match(app.destination(), /libros.html\?libro=4/);
});

test("administrator can create a reader with an initial password who can then sign in", async () => {
  const s = storage();
  let app = boot("login.html", s);
  await app.context.FolioClient.login("admin@example.com", "Demo123!");
  app = boot("admin/usuarios.html", s);
  app.click("#admin-new");
  app.input("[name=nombre]", "Creado por admin");
  app.input("[name=email]", "nuevoadminui@example.com");
  app.input("[name=password]", "Inicial123!");
  app.fire(app.get("form[data-admin-form=user]"), "submit");
  for (let i = 0; i < 30 && !app.get("#admin-editor").hidden; i++) await tick();
  assert.equal(app.get("#admin-editor").hidden, true);
  assert.ok(!JSON.stringify(db(s)).includes("Inicial123!"));
  const user = await app.context.FolioClient.login(
    "nuevoadminui@example.com",
    "Inicial123!",
  );
  assert.equal(user.rol, "usuario");
  app = boot("prestamos.html", s);
  assert.equal(app.get("#loans-empty").hidden, false);
  assert.equal(app.document.querySelectorAll("[data-loan]").length, 0);
});
