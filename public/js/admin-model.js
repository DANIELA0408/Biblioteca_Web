// Shared demo database. Password digests are demo-only; real authorization belongs to the API.
(() => {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const STORAGE_KEY = "folio.admin.demo.v1";
  function today() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  }
  function defaultSeed() {
    return {
      version: 1,
      books: clone(globalThis.FolioLibros || []),
      users: [
        {
          id: 1,
          nombre: "Lector de demostración",
          email: "lector@example.com",
          rol: "usuario",
        },
        {
          id: 2,
          nombre: "Lucía Torres",
          email: "lucia@example.com",
          rol: "usuario",
        },
        {
          id: 3,
          nombre: "Mateo Ramos",
          email: "mateo@example.com",
          rol: "usuario",
        },
        {
          id: 4,
          nombre: "Valeria Solís",
          email: "valeria@example.com",
          rol: "usuario",
        },
        {
          id: 5,
          nombre: "Sofía Molina",
          email: "sofia@example.com",
          rol: "usuario",
        },
        {
          id: 6,
          nombre: "Administración FOLIO",
          email: "admin@example.com",
          rol: "admin",
        },
      ],
      loans: [
        ...clone(globalThis.FolioPrestamos || []),
        {
          id: 201,
          codigo: "F7C210A4",
          usuario_id: 2,
          libro_id: 5,
          fecha_prestamo: "2026-10-30",
          fecha_devolucion: null,
          estado: "pendiente",
        },
        {
          id: 202,
          codigo: "A1D9E320",
          usuario_id: 3,
          libro_id: 8,
          fecha_prestamo: "2026-10-31",
          fecha_devolucion: null,
          estado: "pendiente",
        },
        {
          id: 203,
          codigo: "B4F18C63",
          usuario_id: 2,
          libro_id: 6,
          fecha_prestamo: "2026-10-22",
          fecha_devolucion: null,
          estado: "prestado",
        },
        {
          id: 204,
          codigo: "C2A760E9",
          usuario_id: 4,
          libro_id: 10,
          fecha_prestamo: "2026-10-12",
          fecha_devolucion: "2026-10-28",
          estado: "devuelto",
        },
        {
          id: 205,
          codigo: "D8B340F1",
          usuario_id: 3,
          libro_id: 15,
          fecha_prestamo: "2026-10-31",
          fecha_devolucion: null,
          estado: "pendiente",
        },
      ],
    };
  }
  function validDatabase(value) {
    if (
      !value ||
      value.version !== 1 ||
      !Array.isArray(value.books) ||
      !Array.isArray(value.users) ||
      !Array.isArray(value.loans)
    )
      return false;
    const unique = (items) =>
      items.every((item) => item && Number.isInteger(item.id) && item.id > 0) &&
      new Set(items.map((item) => item.id)).size === items.length;
    if (![value.books, value.users, value.loans].every(unique)) return false;
    if (
      !value.books.every(
        (book) =>
          typeof book.titulo === "string" &&
          typeof book.autor === "string" &&
          typeof book.categoria === "string" &&
          Number.isSafeInteger(book.cantidad) &&
          book.cantidad >= 0 &&
          book.cantidad <= 2147483647,
      )
    )
      return false;
    if (
      !value.users.every(
        (user) =>
          typeof user.nombre === "string" &&
          typeof user.email === "string" &&
          ["admin", "usuario"].includes(user.rol),
      )
    )
      return false;
    if (!value.users.some((user) => user.rol === "admin")) return false;
    if (
      new Set(value.users.map((user) => user.email.toLowerCase())).size !==
      value.users.length
    )
      return false;
    const books = new Set(value.books.map((book) => book.id)),
      users = new Set(value.users.map((user) => user.id));
    return value.loans.every(
      (loan) =>
        books.has(loan.libro_id) &&
        users.has(loan.usuario_id) &&
        typeof loan.codigo === "string" &&
        loan.codigo.length > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(loan.fecha_prestamo) &&
        ["pendiente", "prestado", "devuelto"].includes(loan.estado) &&
        (loan.estado === "devuelto"
          ? /^\d{4}-\d{2}-\d{2}$/.test(loan.fecha_devolucion)
          : loan.fecha_devolucion === null),
    );
  }
  function create(options = {}) {
    const seed = clone(options.seed || defaultSeed());
    let database = clone(seed),
      storage = options.storage,
      storageAvailable = true;
    const history = [];
    const getToday = options.today || today;
    if (storage === undefined) {
      try {
        storage = globalThis.localStorage;
      } catch {
        storageAvailable = false;
      }
    }
    if (!storage) storageAvailable = false;
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (validDatabase(parsed)) database = parsed;
        else storageAvailable = false;
      }
    } catch {
      storageAvailable = false;
    }
    function persist() {
      try {
        if (!storage) return false;
        storage.setItem(STORAGE_KEY, JSON.stringify(database));
        storageAvailable = true;
        return true;
      } catch {
        storageAvailable = false;
        return false;
      }
    }
    function sync() {
      try {
        const saved = storage?.getItem(STORAGE_KEY);
        if (saved && saved !== JSON.stringify(database)) {
          const incoming = JSON.parse(saved);
          if (!validDatabase(incoming))
            throw new Error(
              "Datos locales dañados. Restablece la demostración.",
            );
          database = incoming;
          history.length = 0;
        }
      } catch (error) {
        if (error.message.includes("dañados")) throw error;
      }
    }
    function transact(change) {
      sync();
      if (
        options.activeUserId &&
        !database.users.some(
          (u) => u.id === options.activeUserId && u.rol === "admin",
        )
      )
        throw new Error(
          "Tu acceso de administrador cambió. Vuelve a iniciar sesión.",
        );
      const before = clone(database);
      try {
        change();
        if (!validDatabase(database))
          throw new Error("No se pudo completar el cambio. Revisa los datos.");
      } catch (error) {
        database = before;
        throw error;
      }
      history.push(before);
      if (history.length > 12) history.shift();
      return { persisted: persist() };
    }
    const find = (collection, id, label) => {
      const item = database[collection].find(
        (entry) => entry.id === Number(id),
      );
      if (!item)
        throw new Error(`${label} ya no está disponible. Actualiza la lista.`);
      return item;
    };
    const text = (value, label, max = 255) => {
      const result = String(value || "")
        .trim()
        .replace(/\s+/g, " ");
      if (!result || result.length > max)
        throw new Error(`${label}: escribe entre 1 y ${max} caracteres.`);
      return result;
    };
    const nextId = (collection) =>
      Math.max(0, ...database[collection].map((entry) => entry.id)) + 1;
    function bookValues(values) {
      const cantidad = Number(values.cantidad);
      if (
        String(values.cantidad ?? "").trim() === "" ||
        !Number.isSafeInteger(cantidad) ||
        cantidad < 0 ||
        cantidad > 2147483647
      )
        throw new Error("La cantidad debe ser un número entero de cero o más.");
      const descripcion = String(values.descripcion || "").trim();
      if (descripcion.length > 2000)
        throw new Error("La descripción admite hasta 2000 caracteres.");
      return {
        titulo: text(values.titulo, "Título"),
        autor: text(values.autor, "Autor"),
        categoria: text(values.categoria, "Categoría"),
        cantidad,
        descripcion,
      };
    }
    function userValues(values, id) {
      const email = String(values.email || "")
        .trim()
        .toLowerCase();
      if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Escribe un correo electrónico válido.");
      if (
        database.users.some(
          (user) =>
            user.id !== Number(id) && user.email.toLowerCase() === email,
        )
      )
        throw new Error("Ya existe un usuario con ese correo electrónico.");
      if (!["admin", "usuario"].includes(values.rol))
        throw new Error("Selecciona un rol válido.");
      return { nombre: text(values.nombre, "Nombre"), email, rol: values.rol };
    }
    function deleteReason(kind, id) {
      const field = kind === "books" ? "libro_id" : "usuario_id";
      if (database.loans.some((loan) => loan[field] === Number(id)))
        return "Tiene préstamos asociados. Conserva esta ficha para mantener el historial.";
      if (kind === "users") {
        if (Number(id) === options.activeUserId)
          return "No puedes eliminar tu propia cuenta desde esta sesión.";
        const user = database.users.find((entry) => entry.id === Number(id));
        if (
          user?.rol === "admin" &&
          database.users.filter((entry) => entry.rol === "admin").length <= 1
        )
          return "Debe quedar al menos un administrador en la demostración.";
      }
      return "";
    }
    return {
      get data() {
        return database;
      },
      get canUndo() {
        return history.length > 0;
      },
      get storageAvailable() {
        return storageAvailable;
      },
      today: getToday,
      deleteReason,
      registerUser(values) {
        return transact(() => {
          const fields = userValues({ ...values, rol: "usuario" });
          database.users.push({
            id: nextId("users"),
            ...fields,
            demo_password_hash: values.demo_password_hash,
          });
        });
      },
      requestLoan(usuario_id, libro_id, codigo) {
        return transact(() => {
          const user = find("users", usuario_id, "El usuario");
          if (user.rol !== "usuario")
            throw new Error("Solo los lectores pueden solicitar libros.");
          const book = find("books", libro_id, "El libro");
          if (book.cantidad < 1)
            throw new Error("Este libro no tiene ejemplares disponibles.");
          if (
            database.loans.some(
              (l) =>
                l.usuario_id === user.id &&
                l.libro_id === book.id &&
                l.estado !== "devuelto",
            )
          )
            throw new Error(
              "Ya tienes una solicitud o préstamo activo de este libro. Consúltalo en Mis préstamos.",
            );
          if (
            !/^[A-F0-9]{8}$/.test(codigo) ||
            database.loans.some((l) => l.codigo === codigo)
          )
            throw new Error("Código de solicitud inválido.");
          database.loans.push({
            id: nextId("loans"),
            codigo,
            usuario_id: user.id,
            libro_id: book.id,
            estado: "pendiente",
            fecha_prestamo: getToday(),
            fecha_devolucion: null,
          });
        });
      },
      saveBook(id, values) {
        return transact(() => {
          const fields = bookValues(values);
          if (id) Object.assign(find("books", id, "El libro"), fields);
          else
            database.books.push({
              id: nextId("books"),
              ...fields,
              color: "#315e8d",
              tinta: "#f7f1e3",
              marca: fields.titulo[0].toLowerCase(),
            });
        });
      },
      saveUser(id, values) {
        return transact(() => {
          const fields = userValues(values, id);
          if (id) {
            const user = find("users", id, "El usuario");
            if (user.id === options.activeUserId && fields.rol !== user.rol)
              throw new Error(
                "No puedes cambiar tu propio rol desde esta sesión.",
              );
            if (
              user.rol === "admin" &&
              fields.rol !== "admin" &&
              database.users.filter((entry) => entry.rol === "admin").length <=
                1
            )
              throw new Error("Debe quedar al menos un administrador.");
            Object.assign(user, fields);
          } else
            database.users.push({
              id: nextId("users"),
              ...fields,
              ...(values.demo_password_hash
                ? { demo_password_hash: values.demo_password_hash }
                : {}),
            });
        });
      },
      remove(kind, id) {
        if (!["books", "users"].includes(kind))
          throw new Error("Operación no disponible.");
        return transact(() => {
          find(kind, id, "La ficha");
          const reason = deleteReason(kind, id);
          if (reason) throw new Error(reason);
          database[kind] = database[kind].filter(
            (entry) => entry.id !== Number(id),
          );
        });
      },
      approveLoan(id) {
        return transact(() => {
          const loan = find("loans", id, "El préstamo");
          if (loan.estado !== "pendiente")
            throw new Error("Solo se pueden aprobar solicitudes pendientes.");
          const book = find("books", loan.libro_id, "El libro");
          if (book.cantidad < 1)
            throw new Error("Este libro no tiene ejemplares disponibles.");
          if (loan.fecha_prestamo > getToday())
            throw new Error(
              "La fecha de solicitud no puede ser posterior a hoy.",
            );
          book.cantidad -= 1;
          loan.fecha_solicitud = loan.fecha_prestamo;
          loan.fecha_prestamo = getToday();
          loan.fecha_devolucion = null;
          loan.estado = "prestado";
        });
      },
      returnLoan(id, date) {
        return transact(() => {
          const loan = find("loans", id, "El préstamo");
          if (loan.estado !== "prestado")
            throw new Error(
              "Solo se puede registrar la devolución de un préstamo activo.",
            );
          const parsed = new Date(date + "T12:00:00Z");
          if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(parsed.getTime()) ||
            parsed.toISOString().slice(0, 10) !== date ||
            date < loan.fecha_prestamo ||
            date > getToday()
          )
            throw new Error(
              "La devolución debe estar entre la fecha del préstamo y hoy.",
            );
          const book = find("books", loan.libro_id, "El libro");
          if (book.cantidad >= 2147483647)
            throw new Error(
              "Revisa el inventario: la cantidad disponible alcanzó el máximo permitido.",
            );
          book.cantidad += 1;
          loan.estado = "devuelto";
          loan.fecha_devolucion = date;
        });
      },
      undo() {
        sync();
        if (!history.length) throw new Error("No hay cambios para deshacer.");
        database = history.pop();
        return { persisted: persist() };
      },
      reset() {
        return transact(() => {
          database = clone(seed);
        });
      },
    };
  }
  globalThis.FolioAdminModel = { create, defaultSeed, today, validDatabase };
})();
