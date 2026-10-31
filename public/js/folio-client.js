// Frontend-only adapter. Replace these methods with API calls; see docs/BACKEND.md.
(() => {
  const SESSION = "folio.session.demo.v1";
  const base = new URL(
    document.querySelector('script[src$="folio-client.js"]').src,
    location.href,
  );
  const publicBase = new URL("../", base);
  const model = () => FolioAdminModel.create();
  const publicUser = ({ id, nombre, email, rol }) => ({
    id,
    nombre,
    email,
    rol,
  });
  function store(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      throw new Error(
        "No se pudo guardar la sesión. Habilita el almacenamiento del navegador y vuelve a intentar.",
      );
    }
  }
  async function digest(password) {
    if (!crypto.subtle)
      throw new Error("Abre la prueba desde http://localhost para continuar.");
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(password),
    );
    return Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  async function userCredentials(password) {
    if (password.length < 6 || new TextEncoder().encode(password).length > 72)
      throw new Error(
        "Usa una contraseña de 6 a 72 caracteres y hasta 72 bytes UTF-8.",
      );
    return { demo_password_hash: await digest(password) };
  }
  function session() {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION));
      if (!saved || saved.expires <= Date.now()) return null;
      const user = model().data.users.find((u) => u.id === saved.usuario_id);
      return user ? publicUser(user) : null;
    } catch {
      return null;
    }
  }
  function signIn(user) {
    store(
      SESSION,
      JSON.stringify({
        usuario_id: user.id,
        expires: Date.now() + 8 * 60 * 60 * 1000,
      }),
    );
    return publicUser(user);
  }
  function go(path) {
    location.assign(new URL(path, publicBase).href);
  }
  function safeReturn(value, fallback = "libros.html") {
    try {
      const url = new URL(value || fallback, publicBase);
      const relative = url.pathname.slice(publicBase.pathname.length);
      if (
        url.origin !== publicBase.origin ||
        !url.pathname.startsWith(publicBase.pathname) ||
        !/^(index|libros|prestamos|admin\/(libros|prestamos|usuarios))\.html$/.test(
          relative,
        )
      )
        return fallback;
      const params = new URLSearchParams();
      for (const key of ["q", "categoria", "libro", "prestamo"])
        if (url.searchParams.has(key))
          params.set(key, url.searchParams.get(key));
      return relative + (params.size ? "?" + params : "");
    } catch {
      return fallback;
    }
  }
  function requireRole(role) {
    const user = session();
    if (!user) {
      go("login.html?volver=" + encodeURIComponent(safeReturn(location.href)));
      return null;
    }
    if (user.rol !== role) {
      go(user.rol === "admin" ? "admin/libros.html" : "prestamos.html");
      return null;
    }
    return user;
  }
  function message(text) {
    let node = document.getElementById("folio-flow-message");
    if (!node) {
      node = document.createElement("p");
      node.id = "folio-flow-message";
      node.setAttribute("role", "alert");
      node.style.cssText =
        "padding:16px;margin:16px;background:#f5efdf;color:#192f26;border:1px solid #68796b;font:16px/1.5 sans-serif";
      (document.querySelector("main") || document.body).prepend(node);
    }
    node.textContent = text;
    node.scrollIntoView({ block: "nearest" });
  }
  function logout() {
    if (
      !document.dispatchEvent(
        new Event("folio:before-logout", { cancelable: true }),
      )
    )
      return;
    localStorage.removeItem(SESSION);
    go("login.html");
  }
  function navigation() {
    const user = session();
    for (const link of document.querySelectorAll(
      'a[href="login.html"],#folio-account',
    )) {
      if (!user) continue;
      link.textContent =
        user.rol === "admin" ? "Administración ↗" : "Mi cuenta ↗";
      link.href = new URL(
        user.rol === "admin" ? "admin/libros.html" : "prestamos.html",
        publicBase,
      ).href;
    }
    if (user) {
      const host =
        document.querySelector("nav") || document.querySelector("header");
      if (host) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Cerrar sesión";
        button.style.cssText =
          "color:inherit;font:inherit;background:none;border:0;text-decoration:underline;cursor:pointer;padding:8px";
        button.addEventListener("click", logout);
        host.append(button);
      }
    }
  }
  globalThis.FolioClient = {
    session,
    requireRole,
    safeReturn,
    go,
    message,
    model,
    logout,
    userCredentials,
    books: () => model().data.books,
    myLoans: () => {
      const user = requireRole("usuario");
      return user
        ? model().data.loans.filter((l) => l.usuario_id === user.id)
        : [];
    },
    async login(email, password) {
      const user = model().data.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      const expected = user?.demo_password_hash || (await digest("Demo123!"));
      if (!user || (await digest(password)) !== expected)
        throw new Error("Correo o contraseña incorrectos.");
      return signIn(user);
    },
    async register({ nombre, email, password }) {
      const credentials = await userCredentials(password);
      const db = model();
      const result = db.registerUser({ nombre, email, ...credentials });
      if (!result.persisted)
        throw new Error(
          "No se pudo guardar tu cuenta. Habilita el almacenamiento y vuelve a intentar.",
        );
      return signIn(db.data.users.at(-1));
    },
    requestLoan(libro_id) {
      const user = requireRole("usuario");
      if (!user) throw new Error("Ingresa para solicitar un préstamo.");
      const db = model();
      let codigo;
      do {
        codigo = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
          b.toString(16).padStart(2, "0"),
        )
          .join("")
          .toUpperCase();
      } while (db.data.loans.some((l) => l.codigo === codigo));
      const result = db.requestLoan(user.id, libro_id, codigo);
      if (!result.persisted)
        throw new Error(
          "No se pudo guardar la solicitud. Habilita el almacenamiento y vuelve a intentar.",
        );
      return db.data.loans.at(-1);
    },
  };
  navigation();
  // Refresh restored pages so logout, role changes and stock cannot leave stale actions.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
})();
