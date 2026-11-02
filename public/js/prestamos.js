(() => {
  const root = document.getElementById("folio-loans-page");
  if (!root) return;
  const get = (selector) => root.querySelector(selector);
  const reader = FolioClient.requireRole("usuario");
  if (!reader) return;
  const palette = [
    ["#243f32", "#eee7cf"],
    ["#d9c5b4", "#4a2925"],
    ["#b83930", "#fff4db"],
    ["#e7dfb9", "#29403c"],
    ["#493b35", "#f0dbc1"],
    ["#a9b8a4", "#253d33"],
    ["#cbac83", "#412e25"],
    ["#6b302d", "#f1e4cc"],
  ];
  const books = new Map(
    FolioClient.books().map((book, index) => [
      book.id,
      {
        ...book,
        color: book.color || palette[index % palette.length][0],
        tinta: book.tinta || palette[index % palette.length][1],
      },
    ]),
  );
  const loans = FolioClient.myLoans().filter(
    (loan) => loan.usuario_id === reader.id && books.has(loan.libro_id),
  );
  const labels = {
    pendiente: "Pendiente",
    prestado: "Prestado",
    devuelto: "Devuelto",
  };
  const notes = {
    pendiente:
      "Tu solicitud está en revisión. La fecha registrada corresponde al envío de la solicitud; la biblioteca confirmará su aprobación.",
    prestado:
      "Tu préstamo está activo. La devolución aparecerá cuando la biblioteca la registre.",
    devuelto:
      "La devolución ya está registrada. Esta lectura permanece en tu historial.",
  };
  const angles = [-5, 4, -3, 3, -4];
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const date = (value, fallback = "Por registrar") =>
    value
      ? new Intl.DateTimeFormat("es-PE", {
          timeZone: "America/Lima",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(value + "T12:00:00Z"))
      : fallback;
  let selectedStatus = "";

  function cover(book, angle = 0) {
    return `<span class="loan-cover" style="--book-color:${book.color};--book-ink:${book.tinta};--book-angle:${angle}deg"><span class="loan-cover-author">${escape(book.autor)}</span><strong class="loan-cover-title">${escape(book.titulo)}</strong><span class="loan-cover-mark" aria-hidden="true">${escape(book.marca)}</span><span class="loan-cover-footer">FOLIO / ${escape(book.categoria)}</span></span>`;
  }

  function renderTable() {
    const visible = loans.filter(
      (loan) => !selectedStatus || loan.estado === selectedStatus,
    );
    get("#loans-books").innerHTML = visible
      .map((loan, index) => {
        const book = books.get(loan.libro_id);
        return `<article class="loan-item"><button type="button" class="loan-book-button" data-loan="${loan.id}" aria-label="Ver préstamo ${escape(loan.codigo)} de ${escape(book.titulo)}" aria-describedby="loan-peek-${loan.id}">${cover(book, angles[index % angles.length])}<span class="loan-ticket"><span class="loan-ticket-top"><span class="loan-state" data-state="${loan.estado}">${labels[loan.estado]}</span><span class="loan-ticket-code">${escape(loan.codigo)}</span></span><span class="loan-ticket-open">Ver mi préstamo ↗</span></span></button><div class="loan-peek" id="loan-peek-${loan.id}" role="tooltip"><strong>${escape(book.titulo)}</strong><span>${escape(book.autor)}</span><span>Préstamo: ${date(loan.fecha_prestamo)}</span><span>Devolución: ${date(loan.fecha_devolucion)}</span></div></article>`;
      })
      .join("");
    get("#loans-empty").hidden = visible.length > 0;
    get("#loans-results").textContent =
      `${visible.length} ${visible.length === 1 ? "préstamo" : "préstamos"}`;
    root.querySelectorAll("[data-count]").forEach((count) => {
      count.textContent =
        count.dataset.count === "all"
          ? loans.length
          : loans.filter((loan) => loan.estado === count.dataset.count).length;
    });
    root
      .querySelectorAll("[data-status]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.status === selectedStatus),
        ),
      );
  }

  function switchView(update, target) {
    const perform = () => {
      update();
      target.scrollIntoView({ behavior: "auto", block: "start" });
    };
    if (
      typeof document.startViewTransition === "function" &&
      !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      document.startViewTransition(perform);
    else perform();
  }

  function showLoan(id, animate = true) {
    const loan = loans.find((entry) => entry.id === id);
    if (!loan) {
      FolioClient.message(
        "Este préstamo no existe o no pertenece a tu cuenta. Puedes consultar tus lecturas en esta página.",
      );
      return;
    }
    const book = books.get(loan.libro_id);
    const update = () => {
      get("#loan-detail-reference").textContent =
        `Mi préstamo / ${loan.codigo}`;
      get("#loan-hero-book").innerHTML = cover(book, -8);
      get("#loan-hero-status").textContent = labels[loan.estado];
      get("#loan-book-category").textContent = `FOLIO / ${book.categoria}`;
      get("#loan-detail-title").textContent = book.titulo;
      get("#loan-book-author").textContent = book.autor;
      get("#loan-book-id").textContent =
        `FOL-${String(book.id).padStart(4, "0")}`;
      get("#loan-book-genre").textContent = book.categoria;
      get("#loan-book-stock").textContent =
        `${book.cantidad} ${book.cantidad === 1 ? "ejemplar" : "ejemplares"}`;
      get("#loan-catalog-link").href = `libros.html?libro=${book.id}`;
      get("#loan-book-description").textContent = book.descripcion;
      get("#loan-record-code").textContent = loan.codigo;
      get("#loan-record-status").textContent = labels[loan.estado];
      get("#loan-record-date").textContent = date(loan.fecha_prestamo);
      get("#loan-record-return").textContent = date(
        loan.fecha_devolucion,
        loan.estado === "pendiente" ? "Aún no corresponde" : "Por registrar",
      );
      get("#loan-record-user").textContent =
        `${reader.nombre} · N.º ${loan.usuario_id}`;
      get("#loan-record-email").textContent = reader.email;
      get("#loan-record-note").textContent = notes[loan.estado];
      const progress = { pendiente: 0, prestado: 1, devuelto: 2 }[loan.estado];
      get("#loan-journey-steps").innerHTML = [
        "Solicitud recibida",
        "Préstamo aprobado",
        "Devolución registrada",
      ]
        .map(
          (label, index) =>
            `<li class="${index <= progress ? "is-complete" : ""}" ${index === progress ? 'aria-current="step"' : ""}><span>${String(index + 1).padStart(2, "0")}</span><strong>${label}</strong></li>`,
        )
        .join("");
      get("#loans-table-view").hidden = true;
      get("#loans-detail-view").hidden = false;
      document.title = `${book.titulo} — Mi préstamo | FOLIO`;
    };
    if (animate) switchView(update, get("#loans-detail-view"));
    else update();
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.loan) showLoan(Number(button.dataset.loan));
    else if (button.hasAttribute("data-status")) {
      selectedStatus = button.dataset.status;
      renderTable();
    } else if (button.dataset.action === "back")
      switchView(() => {
        get("#loans-table-view").hidden = false;
        get("#loans-detail-view").hidden = true;
        document.title = "Mis préstamos | FOLIO";
      }, get("#loans-table-view"));
  });

  const lightImages = {
    morning: "assets/images/mesa-manana.webp",
    afternoon: "assets/images/mesa-tarde.webp",
    night: "assets/images/mesa-noche.webp",
  };
  const greetings = {
    morning: "Buenos días.",
    afternoon: "Buenas tardes.",
    night: "Buenas noches.",
  };
  const lightSelect = get("#loans-light");
  function lightForHour(hour) {
    return hour >= 6 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 19
        ? "afternoon"
        : "night";
  }
  function updateLight() {
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
    const light =
      lightSelect.value === "auto" ? lightForHour(hour) : lightSelect.value;
    if (!lightImages[light]) return;
    if (root.dataset.light !== light) {
      root.style.setProperty(
        "--loan-table-image",
        `url("${lightImages[light]}")`,
      );
      root.dataset.light = light;
    }
    get("#loans-greeting").textContent = greetings[light];
  }
  lightSelect.addEventListener("change", updateLight);
  let clock = null;
  function resumeClock() {
    updateLight();
    if (clock === null && typeof setInterval === "function")
      clock = setInterval(updateLight, 60000);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      if (clock !== null) {
        clearInterval(clock);
        clock = null;
      }
    });
    window.addEventListener("pageshow", resumeClock);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateLight();
  });
  renderTable();
  resumeClock();
  const initialLoan = Number(
    new URLSearchParams(globalThis.location?.search || "").get("prestamo"),
  );
  if (new URLSearchParams(location.search).has("prestamo"))
    showLoan(initialLoan, false);
})();
