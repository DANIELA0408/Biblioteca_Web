const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict");
const base = require("path").resolve(__dirname, "../../public/js") + "/";
const context = vm.createContext({ Intl, Date });
for (const file of ["libros-data.js", "prestamos-data.js", "admin-model.js"])
  vm.runInContext(fs.readFileSync(base + file, "utf8"), context);
const memory = new Map(),
  storage = {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  };
const create = (options) =>
  context.FolioAdminModel.create({
    storage,
    today: () => "2026-10-31",
    ...options,
  });
const model = create();
const seed = JSON.stringify(model.data);
assert.equal(model.data.books.length, 30);
assert.equal(model.data.users.length, 6);
assert.equal(model.data.loans.length, 10);
for (const value of [-1, 1.5, "", NaN, Infinity])
  assert.throws(() =>
    model.saveBook(null, {
      titulo: "Libro",
      autor: "Autor",
      categoria: "Ensayo",
      cantidad: value,
    }),
  );
assert.equal(JSON.stringify(model.data), seed);
assert.equal(model.canUndo, false);
model.saveBook(null, {
  titulo: "  Libro de prueba  ",
  autor: "Autor de prueba",
  categoria: "Historia",
  cantidad: "2",
  descripcion: "Descripción",
});
let book = model.data.books.find((b) => b.id === 31);
assert.equal(book.titulo, "Libro de prueba");
assert.equal(book.cantidad, 2);
model.saveBook(31, {
  titulo: "Libro editado",
  autor: "Autor",
  categoria: "Ensayo",
  cantidad: 0,
});
assert.equal(model.data.books.find((b) => b.id === 31).cantidad, 0);
model.remove("books", 31);
assert.ok(!model.data.books.some((b) => b.id === 31));
model.undo();
assert.equal(model.data.books.find((b) => b.id === 31).titulo, "Libro editado");
assert.throws(() => model.remove("books", 1), /historial/);
assert.throws(() => model.remove("users", 1), /historial/);
assert.throws(() => model.remove("users", 6), /administrador/);
assert.throws(
  () =>
    model.saveUser(6, {
      nombre: "Admin",
      email: "admin@example.com",
      rol: "usuario",
    }),
  /administrador/,
);
assert.throws(
  () =>
    model.saveUser(null, {
      nombre: "Duplicado",
      email: "LUCIA@EXAMPLE.COM",
      rol: "usuario",
    }),
  /correo/,
);
assert.throws(
  () =>
    model.saveUser(null, {
      nombre: "Inválido",
      email: "incorrecto",
      rol: "usuario",
    }),
  /correo/,
);
model.saveUser(null, {
  nombre: "Nuevo lector",
  email: " NUEVO@EXAMPLE.COM ",
  rol: "usuario",
});
assert.equal(
  model.data.users.find((u) => u.id === 7).email,
  "nuevo@example.com",
);
model.remove("users", 7);
model.undo();
assert.ok(model.data.users.some((u) => u.id === 7));
const quantity = () => model.data.books.find((b) => b.id === 2).cantidad;
assert.equal(quantity(), 2);
model.approveLoan(102);
assert.equal(quantity(), 1);
assert.equal(model.data.loans.find((l) => l.id === 102).estado, "prestado");
assert.equal(
  model.data.loans.find((l) => l.id === 102).fecha_prestamo,
  "2026-10-31",
);
assert.throws(() => model.approveLoan(102), /pendientes/);
assert.equal(quantity(), 1);
for (const date of ["2026-10-30", "2026-11-01", "2026-02-30", "incorrecta"])
  assert.throws(() => model.returnLoan(102, date));
assert.equal(quantity(), 1);
model.returnLoan(102, "2026-10-31");
assert.equal(quantity(), 2);
assert.equal(model.data.loans.find((l) => l.id === 102).estado, "devuelto");
assert.throws(() => model.returnLoan(102, "2026-10-31"), /activo/);
assert.equal(quantity(), 2);
model.undo();
assert.equal(quantity(), 1);
assert.equal(model.data.loans.find((l) => l.id === 102).estado, "prestado");
model.undo();
assert.equal(quantity(), 2);
assert.equal(model.data.loans.find((l) => l.id === 102).estado, "pendiente");
assert.throws(() => model.approveLoan(202), /ejemplares/);
assert.equal(model.data.books.find((b) => b.id === 8).cantidad, 0);
const restored = create();
assert.equal(JSON.stringify(restored.data), JSON.stringify(model.data));
assert.equal(context.FolioLibros.length, 30);
assert.equal(
  context.FolioPrestamos.find((l) => l.id === 102).estado,
  "pendiente",
);
const beforeReset = JSON.stringify(model.data);
model.reset();
assert.equal(JSON.stringify(model.data), seed);
model.undo();
assert.equal(JSON.stringify(model.data), beforeReset);
const corrupt = JSON.parse(seed);
corrupt.loans[0].libro_id = 9999;
memory.set("folio.admin.demo.v1", JSON.stringify(corrupt));
const recovered = create();
assert.equal(JSON.stringify(recovered.data), seed);
assert.equal(recovered.storageAvailable, false);
const noStorage = context.FolioAdminModel.create({
  storage: {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  },
  today: () => "2026-10-31",
});
assert.equal(
  noStorage.saveBook(null, {
    titulo: "Temporal",
    autor: "Autor",
    categoria: "Ensayo",
    cantidad: 1,
  }).persisted,
  false,
);
assert.ok(noStorage.data.books.some((b) => b.titulo === "Temporal"));
console.log(
  "PASS: CRUD, cantidades, correo único, historial, último administrador, aprobación/devolución sin duplicados, fechas, inventario, deshacer, persistencia, reinicio y recuperación.",
);
