(() => {
  const root = document.getElementById("folio-preview");
  const $ = (s) => root.querySelector(s);
  const books = [
    {
      id: 1,
      title: "La metamorfosis",
      author: "Franz Kafka",
      category: "Literatura",
      quantity: 3,
      bg: "#243f32",
      ink: "#eee7cf",
      mark: "m",
      description:
        "Una mañana, Gregorio Samsa despierta convertido en un insecto. Un relato sobre la identidad, la familia y la extrañeza de existir.",
    },
    {
      id: 2,
      title: "Una habitación propia",
      author: "Virginia Woolf",
      category: "Ensayo",
      quantity: 2,
      bg: "#d9c5b4",
      ink: "#4a2925",
      mark: "w",
      description:
        "Una reflexión sobre la creación literaria, la independencia y el espacio que necesitan las voces para ser escuchadas.",
    },
    {
      id: 3,
      title: "Trilce",
      author: "César Vallejo",
      category: "Poesía",
      quantity: 0,
      bg: "#b83930",
      ink: "#fff4db",
      mark: "t",
      description:
        "Una exploración radical del lenguaje y la emoción. La poesía peruana abre nuevas posibilidades para decir lo que sentimos.",
    },
    {
      id: 4,
      title: "El principito",
      author: "Antoine de Saint-Exupéry",
      category: "Literatura",
      quantity: 4,
      bg: "#e7dfb9",
      ink: "#29403c",
      mark: "✦",
      description:
        "Un viaje entre planetas, encuentros y preguntas. Una historia que invita a mirar de nuevo lo que parece familiar.",
    },
  ];
  let user = "",
    loans = [],
    currentBook = null,
    serial = 1;
  const panel = $("#folio-panel"),
    body = $("#folio-panel-body"),
    notice = $("#folio-panel-notice");
  function esc(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function normalize(s) {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
  function render() {
    const q = normalize($("#folio-query").value),
      category = $("#folio-category").value;
    const found = books.filter(
      (b) =>
        normalize(b.title).includes(q) &&
        (!category || b.category === category),
    );
    $("#folio-results").textContent =
      (q || category ? "Resultados" : "Selección del catálogo") +
      " · " +
      found.length +
      " " +
      (found.length === 1 ? "libro" : "libros");
    $("#folio-empty").hidden = found.length > 0;
    $("#folio-books").innerHTML = found
      .map(
        (b) =>
          `<article class="f-book"><button type="button" class="cursor-interaction" data-book="${b.id}" aria-label="Ver ficha de ${esc(b.title)}"><div class="f-cover" style="--book-bg:${b.bg};--book-ink:${b.ink}"><span class="f-author">${esc(b.author)}</span><strong>${esc(b.title)}</strong><span class="f-mark" aria-hidden="true">${b.mark}</span><small>Folio / ${b.category}</small></div><div class="f-status ${b.quantity ? "" : "unavailable"}">${b.quantity ? "Disponible · " + b.quantity + " ejemplares" : "Sin ejemplares disponibles"}</div><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="f-detail-link">Ver libro ↗</span></button></article>`,
      )
      .join("");
    $("#folio-account").textContent = user ? user + " ↗" : "Ingresar ↗";
    $("#folio-count").textContent = loans.length
      ? "(" + loans.length + ")"
      : "";
    const fullCatalog = $("#folio-full-catalog");
    if (fullCatalog) {
      const params = new URLSearchParams();
      if ($("#folio-query").value.trim())
        params.set("q", $("#folio-query").value.trim());
      if (category) params.set("categoria", category);
      fullCatalog.href =
        "libros.html" + (params.size ? "?" + params.toString() : "");
    }
  }
  function open(title) {
    panel.hidden = false;
    $("#folio-panel-title").textContent = title;
    notice.textContent = "";
    panel.scrollIntoView({ behavior: "auto", block: "start" });
  }
  function account() {
    open(user ? "Tu sesión de prueba" : "Explora como lector");
    body.innerHTML = user
      ? `<p>Has ingresado como <strong>${esc(user)}</strong>.</p><button class="f-solid cursor-interaction" type="button" data-action="logout">Cerrar sesión de prueba</button>`
      : `<p>Prueba la búsqueda y las solicitudes con un perfil de demostración. El registro y el acceso real se incorporarán al conectar el sistema.</p><form id="folio-entry" class="f-panel-form"><label>Tu nombre<input name="nombre" maxlength="35" required autocomplete="given-name" placeholder="¿Cómo te llamas?"></label><button class="f-solid cursor-interaction" type="submit">Entrar al preview ↗</button></form>`;
  }
  function detail(id) {
    currentBook = books.find((b) => b.id === id);
    const b = currentBook;
    if (!b) return;
    open(b.title);
    const requested = loans.some((l) => l.book === id);
    body.innerHTML = `<p class="f-kicker">${esc(b.author)} / ${b.category}</p><p>${b.description}</p><p>${b.quantity ? "Disponibles: " + b.quantity + " ejemplares." : "Todos los ejemplares están prestados."}</p>${b.quantity ? `<button class="f-solid cursor-interaction" type="button" data-action="request" ${requested ? "disabled" : ""}>${requested ? "Solicitud enviada" : user ? "Solicitar préstamo ↗" : "Ingresar para solicitar ↗"}</button>` : "<p>Podrás solicitarlo cuando vuelva a estar disponible.</p>"}`;
  }
  function showLoans() {
    open("Mis préstamos");
    body.innerHTML = !user
      ? '<p>Ingresa con un perfil de prueba para consultar tus solicitudes.</p><button class="f-solid cursor-interaction" data-action="account" type="button">Ingresar ↗</button>'
      : !loans.length
        ? '<p>Todavía no tienes préstamos. Explora el catálogo y elige tu próxima lectura.</p><button class="f-solid cursor-interaction" data-action="catalog" type="button">Buscar un libro ↗</button>'
        : `<p>Solicitudes de ${esc(user)}. Las aprobaciones y devoluciones corresponden al administrador.</p>` +
          loans
            .map(
              (l) =>
                `<div class="f-loan-row"><strong>${esc(books.find((b) => b.id === l.book).title)}</strong><span>${l.code} · Pendiente · ${l.date}</span></div>`,
            )
            .join("");
  }
  $("#folio-search").addEventListener("submit", (e) => {
    e.preventDefault();
    render();
    $("#folio-catalog").scrollIntoView({ behavior: "auto", block: "start" });
  });
  $("#folio-query").addEventListener("input", render);
  $("#folio-category").addEventListener("change", render);
  root.addEventListener("submit", (e) => {
    if (e.target.id !== "folio-entry") return;
    e.preventDefault();
    const input = e.target.querySelector("input");
    const name = input.value.trim();
    if (!name) {
      input.setCustomValidity("Escribe tu nombre para continuar.");
      input.reportValidity();
      return;
    }
    user = name;
    render();
    if (currentBook) detail(currentBook.id);
    else {
      showLoans();
      notice.textContent = "Sesión de demostración iniciada.";
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.name === "nombre") e.target.setCustomValidity("");
  });
  root.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#folio-"]');
    if (link) {
      e.preventDefault();
      const target = $(link.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "auto", block: "start" });
    }
    const button = e.target.closest("button");
    if (!button) return;
    if (button.dataset.book) {
      window.location.assign(
        "libros.html?libro=" + Number(button.dataset.book),
      );
      return;
    }
    switch (button.dataset.action) {
      case "close":
        panel.hidden = true;
        currentBook = null;
        break;
      case "account":
        account();
        break;
      case "logout":
        user = "";
        loans = [];
        currentBook = null;
        render();
        account();
        notice.textContent = "Sesión de prueba cerrada.";
        break;
      case "loans":
        currentBook = null;
        showLoans();
        break;
      case "catalog":
        panel.hidden = true;
        $("#folio-catalog").scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        break;
      case "request":
        if (!user) {
          account();
          return;
        }
        if (
          !currentBook ||
          !currentBook.quantity ||
          loans.some((l) => l.book === currentBook.id)
        )
          return;
        loans.push({
          book: currentBook.id,
          code: "DEMO-" + String(serial++).padStart(4, "0"),
          date: new Date().toLocaleDateString("es-PE", {
            timeZone: "America/Lima",
          }),
        });
        detail(currentBook.id);
        notice.textContent =
          "Solicitud enviada. Estado: Pendiente de aprobación. Puedes consultarla en Mis préstamos.";
        render();
        break;
    }
  });
  root.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-flow-category]");
    if (!trigger) return;
    $("#folio-query").value = "";
    $("#folio-category").value = trigger.dataset.flowCategory;
    render();
    $("#folio-catalog").scrollIntoView({ behavior: "auto", block: "start" });
  });
  render();
  // Recalculate the cut from the unmodified sculpture dimensions at each viewport size.
  const flowSection = $(".f-flow");
  const flowSculpture = $(".f-flow-sculpture img");
  function syncFlowCut() {
    if (!flowSection || typeof flowSection.getBoundingClientRect !== "function")
      return;
    const sectionBox = flowSection.getBoundingClientRect();
    const sculptureBox = flowSculpture.getBoundingClientRect();
    if (!sculptureBox.height) return;
    const cutY = sculptureBox.top - sectionBox.top + sculptureBox.height * 0.39;
    flowSection.style.setProperty("--f-split-y", cutY + "px");
    for (const paragraph of flowSection.querySelectorAll(
      ".f-contour-column p",
    )) {
      const box = paragraph.getBoundingClientRect();
      const localCut = cutY - (box.top - sectionBox.top);
      paragraph.classList.toggle(
        "f-crosses-cut",
        localCut > 0 && localCut < box.height,
      );
      paragraph.style.setProperty("--f-text-cut", localCut + "px");
      paragraph.style.color =
        localCut >= box.height
          ? "#171b17"
          : localCut <= 0
            ? "#f9f4e6"
            : "transparent";
    }
  }
  const scheduleFlowCut = () => {
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(syncFlowCut);
    else syncFlowCut();
  };
  if (flowSculpture) flowSculpture.addEventListener("load", scheduleFlowCut);
  if (typeof ResizeObserver === "function") {
    const flowSizeObserver = new ResizeObserver(scheduleFlowCut);
    flowSizeObserver.observe(flowSection);
    flowSizeObserver.observe(flowSculpture);
  }
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(scheduleFlowCut);
  scheduleFlowCut();
})();
