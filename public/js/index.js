(() => {
  const root = document.getElementById("folio-preview");
  const $ = (s) => root.querySelector(s);
  const books = FolioClient.books()
    .slice(0, 4)
    .map((b) => ({
      id: b.id,
      title: b.titulo,
      author: b.autor,
      category: b.categoria,
      quantity: b.cantidad,
      bg: b.color || "#243f32",
      ink: b.tinta || "#eee7cf",
      mark: b.marca || b.titulo[0],
    }));
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
          `<article class="f-book"><button type="button" class="cursor-interaction" data-book="${b.id}" aria-label="Ver ficha de ${esc(b.title)}"><div class="f-cover" style="--book-bg:${b.bg};--book-ink:${b.ink}"><span class="f-author">${esc(b.author)}</span><strong>${esc(b.title)}</strong><span class="f-mark" aria-hidden="true">${esc(b.mark)}</span><small>Folio / ${esc(b.category)}</small></div><div class="f-status ${b.quantity ? "" : "unavailable"}">${b.quantity ? "Disponible · " + b.quantity + " ejemplares" : "Sin ejemplares disponibles"}</div><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="f-detail-link">Ver libro ↗</span></button></article>`,
      )
      .join("");

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
  $("#folio-search").addEventListener("submit", (e) => {
    e.preventDefault();
    render();
    $("#folio-catalog").scrollIntoView({ behavior: "auto", block: "start" });
  });
  $("#folio-query").addEventListener("input", render);
  $("#folio-category").addEventListener("change", render);
  root.addEventListener("click", (e) => {
    const button = e.target.closest("[data-book]");
    if (button)
      FolioClient.go("libros.html?libro=" + Number(button.dataset.book));
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
