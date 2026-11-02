(() => {
  const root = document.getElementById("folio-admin");
  if (!root) return;
  const get = (selector) => root.querySelector(selector);
  const user = FolioClient.requireRole("admin");
  if (!user) return;
  const model = globalThis.FolioAdminModel.create({ activeUserId: user.id });
  const views = {
    books: {
      title: "Libros",
      intro: "Cuida la colección,<br>una ficha a la vez.",
      image: "catalogo-estante.webp",
      caption: "Archivo de la colección",
      search: "Buscar por título o autor",
      filter: "Categoría",
      all: "Todas",
      newLabel: "Nueva ficha ↗",
      number: "01",
    },
    loans: {
      title: "Préstamos",
      intro: "Cada lectura,<br>un recorrido cuidado.",
      image: "mesa-manana.webp",
      caption: "Solicitudes y devoluciones",
      search: "Buscar por código, libro o usuario",
      filter: "Estado",
      all: "Todos",
      number: "02",
    },
    users: {
      title: "Usuarios",
      intro: "Las personas detrás<br>de cada lectura.",
      image: "biblioteca-manana.jpg",
      caption: "El registro de lectores",
      search: "Buscar por nombre o correo",
      filter: "Rol",
      all: "Todos",
      newLabel: "Nuevo usuario ↗",
      number: "03",
    },
  };
  const hashes = { libros: "books", prestamos: "loans", usuarios: "users" };
  const state = {
    view:
      hashes[globalThis.location?.hash?.slice(1)] ||
      root.dataset.initialView ||
      "books",
    query: "",
    filter: "",
    page: 1,
    editor: null,
    dirty: false,
    pending: null,
  };
  if (!views[state.view]) state.view = "books";
  const PAGE_SIZE = 10;
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const bookById = (id) =>
    model.data.books.find((book) => book.id === Number(id));
  const userById = (id) =>
    model.data.users.find((user) => user.id === Number(id));
  const loanById = (id) =>
    model.data.loans.find((loan) => loan.id === Number(id));
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat("es-PE", {
          timeZone: "America/Lima",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(value + "T12:00:00Z"))
      : "Por registrar";
  const statusLabels = {
    pendiente: "Pendiente",
    prestado: "Prestado",
    devuelto: "Devuelto",
  };
  const rowButton = (action, id, label, danger = false) =>
    `<button type="button" class="admin-link ${danger ? "is-danger" : ""}" data-action="${action}" data-id="${id}">${label}</button>`;
  const cover = (book) =>
    `<div class="admin-cover" style="--cover-bg:${book.color || "#315e8d"};--cover-ink:${book.tinta || "#f7f1e3"}"><span>${escape(book.autor || "Nombre del autor")}</span><strong>${escape(book.titulo || "Una nueva historia")}</strong><em aria-hidden="true">${escape(book.marca || (book.titulo || "f")[0].toLowerCase())}</em><span>FOLIO / ${escape(book.categoria || "Colección")}</span></div>`;

  function notify(message, error = false, actions = "") {
    get("#admin-notice").hidden = false;
    get("#admin-notice").classList.toggle("is-error", error);
    get("#admin-notice-text").textContent = message;
    get("#admin-notice-text").setAttribute("role", error ? "alert" : "status");
    get("#admin-notice-actions").innerHTML = actions;
    get("#admin-undo").hidden = !model.canUndo || !!actions;
  }
  function clearNotice() {
    get("#admin-notice").hidden = true;
    get("#admin-notice-actions").innerHTML = "";
  }
  function closeEditor() {
    state.editor = null;
    state.dirty = false;
    state.pending = null;
    get("#admin-editor").hidden = true;
    get("#admin-editor").innerHTML = "";
  }
  function discardFirst(pending) {
    if (!state.dirty) return false;
    state.pending = pending;
    notify(
      "Hay cambios sin guardar en la ficha. Puedes seguir editando o descartarlos.",
      true,
      '<button type="button" data-action="stay">Seguir editando</button><button type="button" data-action="discard">Descartar cambios</button>',
    );
    return true;
  }
  function activate(view, updateHash = true) {
    if (!views[view]) return;
    closeEditor();
    clearNotice();
    state.view = view;
    state.query = "";
    state.filter = "";
    state.page = 1;
    render();
    if (updateHash && globalThis.location) {
      try {
        globalThis.location.hash = Object.keys(hashes).find(
          (hash) => hashes[hash] === view,
        );
      } catch {
        /* Navigation remains available in this page. */
      }
    }
  }
  function navigate(view) {
    if (view === state.view) return;
    if (!discardFirst({ type: "navigate", view })) activate(view);
  }
  function complete(change, message, query) {
    if (!FolioClient.requireRole("admin")) return;
    try {
      const result = change();
      closeEditor();
      if (query !== undefined) {
        state.query = query;
        state.filter = "";
        state.page = 1;
      }
      render();
      notify(
        message +
          (result.persisted
            ? ""
            : " El cambio se conserva durante esta sesión."),
      );
    } catch (error) {
      notify(error.message, true);
    }
  }

  function matchedRows() {
    const query = normalize(state.query);
    if (state.view === "books")
      return model.data.books
        .filter(
          (book) =>
            (!state.filter || book.categoria === state.filter) &&
            normalize(book.titulo + " " + book.autor).includes(query),
        )
        .sort((a, b) => a.id - b.id);
    if (state.view === "users")
      return model.data.users
        .filter(
          (user) =>
            (!state.filter || user.rol === state.filter) &&
            normalize(user.nombre + " " + user.email).includes(query),
        )
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const rank = { pendiente: 0, prestado: 1, devuelto: 2 };
    return model.data.loans
      .filter(
        (loan) =>
          (!state.filter || loan.estado === state.filter) &&
          normalize(
            [
              loan.codigo,
              bookById(loan.libro_id)?.titulo || "",
              userById(loan.usuario_id)?.nombre || "",
            ].join(" "),
          ).includes(query),
      )
      .sort((a, b) => rank[a.estado] - rank[b.estado] || a.id - b.id);
  }
  function table(rows) {
    let headers, widths, content;
    if (state.view === "books") {
      headers = ["Libro", "Categoría", "Disponibles", "Acciones"];
      widths = [41, 17, 14, 28];
      content = rows.map((book) => [
        `<div class="admin-book-cell"><span class="admin-mini-cover" style="--cover-bg:${book.color || "#315e8d"};--cover-ink:${book.tinta || "#f7f1e3"}" aria-hidden="true">${escape(book.marca || book.titulo[0])}</span><span><strong class="admin-cell-title">${escape(book.titulo)}</strong><span class="admin-cell-note">${escape(book.autor)}</span></span></div>`,
        escape(book.categoria),
        `${book.cantidad}${book.cantidad === 0 ? '<span class="admin-cell-note">Sin ejemplares</span>' : ""}`,
        `<div class="admin-row-actions">${rowButton("edit-book", book.id, "Editar")}${rowButton("delete-book", book.id, "Eliminar", true)}</div>`,
      ]);
    } else if (state.view === "users") {
      headers = ["Persona", "Rol", "Préstamos", "Acciones"];
      widths = [43, 15, 14, 28];
      content = rows.map((user) => [
        `<strong class="admin-cell-title">${escape(user.nombre)}</strong><span class="admin-cell-note">${escape(user.email)}</span>`,
        user.rol === "admin" ? "Administrador" : "Usuario",
        String(
          model.data.loans.filter((loan) => loan.usuario_id === user.id).length,
        ),
        `<div class="admin-row-actions">${rowButton("edit-user", user.id, "Editar")}${rowButton("delete-user", user.id, "Eliminar", true)}</div>`,
      ]);
    } else {
      headers = ["Libro / código", "Usuario", "Estado / fecha", "Acciones"];
      widths = [34, 22, 20, 24];
      content = rows.map((loan) => {
        const book = bookById(loan.libro_id),
          user = userById(loan.usuario_id);
        const action =
          loan.estado === "pendiente"
            ? `<button type="button" class="admin-inline-action" data-action="review-loan" data-id="${loan.id}">Revisar solicitud</button>`
            : loan.estado === "prestado"
              ? `<button type="button" class="admin-inline-action" data-action="review-loan" data-id="${loan.id}">Devolver</button>`
              : rowButton("review-loan", loan.id, "Ver detalle");
        return [
          `<strong class="admin-cell-title">${escape(book?.titulo || "Libro no disponible")}</strong><span class="admin-cell-note">${escape(loan.codigo)}</span>`,
          `<span>${escape(user?.nombre || "Usuario no disponible")}</span>`,
          `<span class="admin-state" data-state="${loan.estado}">${statusLabels[loan.estado]}</span><span class="admin-cell-note">${date(loan.estado === "devuelto" ? loan.fecha_devolucion : loan.fecha_prestamo)}</span>`,
          action,
        ];
      });
    }
    return `<table class="admin-table"><thead><tr>${headers.map((label, index) => `<th scope="col" style="width:${widths[index]}%">${label}</th>`).join("")}</tr></thead><tbody>${content.map((cells) => `<tr>${cells.map((cell, index) => `<td data-label="${headers[index]}">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function render() {
    const view = views[state.view];
    root.dataset.view = state.view;
    get("#admin-title").innerHTML = `${view.title}<span>.</span>`;
    get("#admin-intro").innerHTML = view.intro;
    get("#admin-hero-image").src = `../assets/images/${view.image}`;
    get("#admin-hero-image").alt = view.caption;
    get("#admin-hero-caption").textContent = view.caption;
    get("#admin-query").placeholder = view.search;
    if (get("#admin-query").value !== state.query)
      get("#admin-query").value = state.query;
    get("#admin-new").hidden = !view.newLabel;
    get("#admin-new").textContent = view.newLabel || "";
    get("#admin-filter-name").textContent = view.filter;
    const options =
      state.view === "books"
        ? [...new Set(model.data.books.map((book) => book.categoria))].sort(
            (a, b) => a.localeCompare(b, "es"),
          )
        : state.view === "loans"
          ? ["pendiente", "prestado", "devuelto"]
          : ["usuario", "admin"];
    get("#admin-filter").innerHTML =
      `<option value="">${view.all}</option>` +
      options
        .map(
          (option) =>
            `<option value="${escape(option)}">${escape(statusLabels[option] || (option === "admin" ? "Administrador" : option === "usuario" ? "Usuario" : option))}</option>`,
        )
        .join("");
    get("#admin-filter").value = state.filter;
    root.querySelectorAll("[data-admin-view]").forEach((link) => {
      if (link.dataset.adminView === state.view)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const rows = matchedRows(),
      pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * PAGE_SIZE,
      visible = rows.slice(start, start + PAGE_SIZE);
    get("#admin-results").textContent = rows.length
      ? `${start + 1}–${start + visible.length} de ${rows.length} registros`
      : "Sin resultados";
    get("#admin-table-area").innerHTML = rows.length
      ? table(visible)
      : '<div class="admin-empty"><h2>Un espacio por completar.</h2><p>No hay registros que coincidan con esta búsqueda.</p><button class="admin-link" type="button" data-action="clear-search">Ver todos los registros ↗</button></div>';
    get("#admin-page-number").textContent = `Página ${state.page} de ${pages}`;
    get("#admin-prev").disabled = state.page === 1;
    get("#admin-next").disabled = state.page === pages;
    get("#admin-storage-note").textContent = model.storageAvailable
      ? "Datos de ejemplo · Cambios locales"
      : "Datos de ejemplo · Sesión actual";
    get("#admin-page-label").textContent = `Archivo / ${view.number}`;
    document.title = `${view.title} — Administración | FOLIO`;
  }

  function editor(title, intro, body, type, id = null) {
    clearNotice();
    state.editor = { type, id };
    state.dirty = false;
    const section = get("#admin-editor");
    section.hidden = false;
    section.innerHTML = `<div class="admin-editor-heading"><div><h2>${title}</h2><p>${intro}</p></div><button type="button" data-action="close-editor">Cerrar ×</button></div>${body}`;
    section.scrollIntoView({ behavior: "auto", block: "start" });
    section
      .querySelector("input:not([type=hidden]), select, textarea")
      ?.focus({ preventScroll: true });
  }
  function input(
    name,
    label,
    value = "",
    type = "text",
    full = false,
    extra = "",
  ) {
    return `<div class="admin-field ${full ? "is-full" : ""}"><label for="admin-field-${name}">${label}</label><input id="admin-field-${name}" name="${name}" type="${type}" value="${escape(value)}" required ${extra}></div>`;
  }
  function actions(primary = "Guardar cambios") {
    return `<div class="admin-form-actions"><button class="admin-primary" type="submit">${primary} ↗</button><button type="button" data-action="close-editor">Cancelar</button></div>`;
  }
  function openBook(id) {
    const book = id
      ? bookById(id)
      : {
          titulo: "",
          autor: "",
          categoria: "Literatura",
          cantidad: 1,
          descripcion: "",
        };
    if (!book) return notify("El libro ya no está disponible.", true);
    const categoryOptions = [
      ...new Set([
        "Literatura",
        "Poesía",
        "Ensayo",
        ...model.data.books.map((entry) => entry.categoria),
      ]),
    ];
    const fields = `${input("titulo", "Título", book.titulo, "text", true, 'maxlength="255"')}${input("autor", "Autor", book.autor, "text", true, 'maxlength="255"')}${input("categoria", "Categoría", book.categoria, "text", false, 'maxlength="255" list="admin-categories"')}<datalist id="admin-categories">${categoryOptions.map((category) => `<option value="${escape(category)}"></option>`).join("")}</datalist>${input("cantidad", "Ejemplares disponibles", book.cantidad, "number", false, 'min="0" max="2147483647" step="1"')}<div class="admin-field is-full"><label for="admin-field-descripcion">Descripción</label><textarea name="descripcion" id="admin-field-descripcion" maxlength="2000">${escape(book.descripcion || "")}</textarea><small>Opcional · Hasta 2000 caracteres.</small></div>`;
    editor(
      id ? "Editar una historia." : "Una nueva ficha.",
      "Título, autor, categoría y ejemplares disponibles.",
      `<div class="admin-editor-grid"><form data-admin-form="book"><div class="admin-form-fields">${fields}</div>${actions(id ? "Guardar cambios" : "Crear libro")}</form><div class="admin-editor-preview"><div id="admin-editor-cover">${cover(book)}</div><p>Vista de la portada editorial.</p></div></div>`,
      "book",
      id,
    );
  }
  function openUser(id) {
    const user = id ? userById(id) : { nombre: "", email: "", rol: "usuario" };
    if (!user) return notify("El usuario ya no está disponible.", true);
    editor(
      id ? "Editar un perfil." : "Un nuevo lector.",
      "Datos del usuario en esta demostración.",
      `<form data-admin-form="user"><div class="admin-form-fields">${input("nombre", "Nombre", user.nombre, "text", true, 'maxlength="255" autocomplete="name"')}${input("email", "Correo electrónico", user.email, "email", true, 'maxlength="255" autocomplete="email"')}${!id ? input("password", "Contraseña inicial de prueba", "", "password", true, 'minlength="6" maxlength="72" autocomplete="new-password"') : ""}<div class="admin-field is-full"><label for="admin-field-rol">Rol</label><select id="admin-field-rol" name="rol"><option value="usuario" ${user.rol === "usuario" ? "selected" : ""}>Usuario</option><option value="admin" ${user.rol === "admin" ? "selected" : ""}>Administrador</option></select></div></div>${actions(id ? "Guardar cambios" : "Crear usuario")}</form>`,
      "user",
      id,
    );
  }
  function openDelete(kind, id) {
    const item = kind === "books" ? bookById(id) : userById(id);
    if (!item) return;
    const reason = model.deleteReason(kind, id),
      title = item.titulo || item.nombre;
    editor(
      reason ? "Conservar el historial." : "Eliminar esta ficha.",
      kind === "books" ? "Archivo de libros" : "Registro de usuarios",
      `<div class="admin-review"><h3>${escape(title)}</h3><p>${escape(reason || "Se eliminará de esta demostración local. Podrás deshacer este cambio durante la sesión.")}</p><div class="admin-form-actions">${reason ? '<button type="button" class="admin-primary" data-action="close-editor">Entendido</button>' : `<button type="button" class="admin-primary admin-delete-confirm" data-action="confirm-delete" data-kind="${kind}" data-id="${id}">Eliminar ficha</button><button type="button" data-action="close-editor">Conservar</button>`}</div></div>`,
      "delete",
      id,
    );
  }
  function reviewLoan(id) {
    const loan = loanById(id);
    if (!loan) return;
    const book = bookById(loan.libro_id),
      user = userById(loan.usuario_id),
      pending = loan.estado === "pendiente",
      active = loan.estado === "prestado";
    const facts = `<dl><div><dt>Usuario</dt><dd>${escape(user.nombre)}</dd></div><div><dt>Código</dt><dd>${escape(loan.codigo)}</dd></div><div><dt>Estado</dt><dd>${statusLabels[loan.estado]}</dd></div><div><dt>Disponibles</dt><dd>${book.cantidad} ejemplares</dd></div><div><dt>Fecha de préstamo</dt><dd>${date(loan.fecha_prestamo)}</dd></div><div><dt>Devolución</dt><dd>${date(loan.fecha_devolucion)}</dd></div></dl>`;
    let controls;
    if (pending)
      controls = `<p>${book.cantidad > 0 ? "Al aprobar, se descontará un ejemplar disponible. La fecha del préstamo será la de hoy." : "No hay ejemplares disponibles. Revisa el inventario antes de aprobar esta solicitud."}</p><div class="admin-form-actions"><button type="button" class="admin-primary" data-action="approve-loan" data-id="${id}" ${book.cantidad < 1 ? "disabled" : ""}>Confirmar aprobación ↗</button><button type="button" data-action="close-editor">Volver</button></div>`;
    else if (active)
      controls = `<form data-admin-form="return"><div class="admin-field"><label for="admin-return-date">Fecha de devolución</label><input id="admin-return-date" name="fecha" type="date" value="${model.today()}" min="${loan.fecha_prestamo}" max="${model.today()}" required></div><p>Se devolverá un ejemplar al inventario disponible.</p>${actions("Registrar devolución")}</form>`;
    else
      controls = `<p>La devolución ya está registrada. Se conserva el préstamo en el historial.</p><div class="admin-form-actions"><button type="button" class="admin-primary" data-action="close-editor">Volver a la lista</button></div>`;
    editor(
      pending
        ? "Una lectura por comenzar."
        : active
          ? "De vuelta al estante."
          : "Una lectura en el historial.",
      "Revisa el registro antes de confirmar.",
      `<div class="admin-editor-grid"><div class="admin-review"><h3>${escape(book.titulo)}</h3><p>${escape(book.autor)}</p>${facts}${controls}</div><div class="admin-editor-preview">${cover(book)}<p>FOLIO / ${escape(book.categoria)}</p></div></div>`,
      active ? "return" : "loan",
      id,
    );
  }
  function resetPanel() {
    editor(
      "Volver al primer día.",
      "Restablecer la demostración",
      '<div class="admin-review"><p>Se recuperarán los libros, usuarios y préstamos de ejemplo. Los cambios actuales de este panel se sustituirán por esos datos.</p><div class="admin-form-actions"><button type="button" class="admin-primary" data-action="confirm-reset">Restablecer datos de ejemplo</button><button type="button" data-action="close-editor">Conservar mis cambios</button></div></div>',
      "reset",
    );
  }
  function requestOpen(type, id) {
    if (discardFirst({ type: "open", editorType: type, id })) return;
    if (type === "book") openBook(id);
    else if (type === "user") openUser(id);
    else if (type === "loan") reviewLoan(id);
    else if (type === "delete-book") openDelete("books", id);
    else if (type === "delete-user") openDelete("users", id);
    else if (type === "reset") resetPanel();
  }

  get("#admin-search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  get("#admin-query").addEventListener("input", () => {
    state.query = get("#admin-query").value;
    state.page = 1;
    render();
  });
  get("#admin-filter").addEventListener("change", () => {
    state.filter = get("#admin-filter").value;
    state.page = 1;
    render();
  });
  get("#admin-prev").addEventListener("click", () => {
    state.page -= 1;
    render();
  });
  get("#admin-next").addEventListener("click", () => {
    state.page += 1;
    render();
  });
  root.addEventListener("input", (event) => {
    const form = event.target.closest("form[data-admin-form]");
    if (!form) return;
    state.dirty = true;
    if (form.dataset.adminForm === "book") {
      const values = Object.fromEntries(new FormData(form).entries()),
        original = bookById(state.editor?.id) || {};
      get("#admin-editor-cover").innerHTML = cover({ ...original, ...values });
    }
  });
  root.addEventListener("change", (event) => {
    if (event.target.closest("form[data-admin-form]")) state.dirty = true;
  });
  root.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-admin-form]");
    if (!form) return;
    event.preventDefault();
    if (
      !form.reportValidity() ||
      !state.editor ||
      form.dataset.adminForm !== state.editor.type
    )
      return;
    const values = Object.fromEntries(new FormData(form).entries()),
      id = state.editor.id;
    if (form.dataset.adminForm === "book")
      complete(
        () => model.saveBook(id, values),
        id ? "Ficha actualizada." : "Libro añadido a la colección.",
        id ? undefined : values.titulo,
      );
    else if (form.dataset.adminForm === "user") {
      const save = (fields) =>
        complete(
          () => model.saveUser(id, fields),
          id ? "Perfil actualizado." : "Usuario añadido al registro.",
          id ? undefined : fields.nombre,
        );
      if (id) save(values);
      else {
        const currentEditor = state.editor;
        const submit = form.querySelector('[type="submit"]');
        if (submit.disabled) return;
        submit.disabled = true;
        FolioClient.userCredentials(values.password)
          .then((credentials) => {
            if (state.editor === currentEditor)
              save({ ...values, ...credentials });
          })
          .catch((error) => notify(error.message, true))
          .finally(() => {
            submit.disabled = false;
          });
      }
    } else if (form.dataset.adminForm === "return")
      complete(
        () => model.returnLoan(id, values.fecha),
        "Devolución registrada. Se añadió un ejemplar disponible.",
      );
  });
  root.addEventListener("click", (event) => {
    const navigation = event.target.closest("a[data-admin-view]");
    if (navigation && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      navigate(navigation.dataset.adminView);
      return;
    }
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const id = Number(button.dataset.id);
    switch (button.dataset.action) {
      case "new":
        requestOpen(state.view === "books" ? "book" : "user");
        break;
      case "edit-book":
        requestOpen("book", id);
        break;
      case "edit-user":
        requestOpen("user", id);
        break;
      case "delete-book":
        requestOpen("delete-book", id);
        break;
      case "delete-user":
        requestOpen("delete-user", id);
        break;
      case "review-loan":
        requestOpen("loan", id);
        break;
      case "close-editor":
        if (!discardFirst({ type: "close" })) closeEditor();
        break;
      case "confirm-delete":
        complete(
          () => model.remove(button.dataset.kind, id),
          "Ficha eliminada de la demostración.",
        );
        break;
      case "approve-loan":
        complete(
          () => model.approveLoan(id),
          "Préstamo aprobado. Se descontó un ejemplar disponible.",
        );
        break;
      case "clear-search":
        state.query = "";
        state.filter = "";
        state.page = 1;
        render();
        break;
      case "undo":
        if (!discardFirst({ type: "undo" }))
          complete(() => model.undo(), "Se deshizo el último cambio.");
        break;
      case "reset-demo":
        requestOpen("reset");
        break;
      case "confirm-reset":
        complete(() => model.reset(), "Datos de ejemplo restablecidos.", "");
        break;
      case "stay":
        state.pending = null;
        clearNotice();
        break;
      case "discard": {
        const pending = state.pending;
        state.dirty = false;
        state.pending = null;
        clearNotice();
        if (pending?.type === "logout") FolioClient.logout();
        else if (pending?.type === "navigate") activate(pending.view);
        else if (pending?.type === "open")
          requestOpen(pending.editorType, pending.id);
        else if (pending?.type === "undo")
          complete(() => model.undo(), "Se deshizo el último cambio.");
        else closeEditor();
        break;
      }
    }
  });
  if (typeof window !== "undefined")
    window.addEventListener("hashchange", () => {
      const view = hashes[globalThis.location.hash.slice(1)];
      if (view && view !== state.view) navigate(view);
    });
  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  document.addEventListener("folio:before-logout", (event) => {
    if (discardFirst({ type: "logout" })) event.preventDefault();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      state.editor &&
      !discardFirst({ type: "close" })
    )
      closeEditor();
  });
  render();
})();
