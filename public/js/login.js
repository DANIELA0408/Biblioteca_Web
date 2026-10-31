(() => {
  const root = document.getElementById("folio-login-preview");
  const get = (s) => root.querySelector(s);
  const form = get("#folio-access-form"),
    password = get("#folio-access-password"),
    name = get("#folio-access-name"),
    status = get("#folio-access-status"),
    toggle = get("#folio-show-password");
  let registration = false;
  const scene = get(".login-photo>img");
  const originalScene = scene.src;
  const sceneImages = {
    morning: originalScene,
    afternoon: "assets/images/biblioteca-tarde.webp",
    night: "assets/images/biblioteca-noche.webp",
  };
  const greetings = {
    morning: "Buenos días.",
    afternoon: "Buenas tardes.",
    night: "Buenas noches.",
  };
  const descriptions = {
    morning: "Biblioteca iluminada por la luz de la mañana",
    afternoon: "La misma biblioteca con luz dorada de la tarde",
    night: "La misma biblioteca de noche, con la lámpara de lectura encendida",
  };
  const caption = get(".login-caption");
  const greeting = document.createElement("p");
  greeting.id = "folio-day-greeting";
  greeting.className = "login-greeting";
  caption.prepend(greeting);
  const lightSelect = get("#folio-light-mode");
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
    const mode =
      lightSelect.value === "auto" ? lightForHour(hour) : lightSelect.value;
    root.dataset.light = mode;
    if (scene.getAttribute("data-current-light") !== mode) {
      scene.src = sceneImages[mode];
      scene.alt = descriptions[mode];
      scene.setAttribute("data-current-light", mode);
    }
    greeting.textContent = greetings[mode];
  }
  lightSelect.addEventListener("change", updateLight);
  updateLight();
  let lightClock =
    typeof setInterval === "function" ? setInterval(updateLight, 60000) : null;
  if (typeof document.addEventListener === "function")
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) updateLight();
    });
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      if (lightClock !== null) {
        clearInterval(lightClock);
        lightClock = null;
      }
    });
    window.addEventListener("pageshow", () => {
      updateLight();
      if (lightClock === null && typeof setInterval === "function")
        lightClock = setInterval(updateLight, 60000);
    });
  }
  toggle.addEventListener("click", () => {
    const show = password.type === "password";
    password.type = show ? "text" : "password";
    toggle.textContent = show ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(show));
    toggle.setAttribute(
      "aria-label",
      show ? "Ocultar contraseña" : "Mostrar contraseña",
    );
  });
  get("#folio-switch-view").addEventListener("click", () => {
    registration = !registration;
    root.dataset.view = registration ? "register" : "login";
    get("#folio-name-field").hidden = !registration;
    name.required = registration;
    get("#folio-login-title").innerHTML = registration
      ? "Tu primera<br>página."
      : "Continúa tu<br>historia.";
    get("#folio-login-intro").textContent = registration
      ? "Crea tu cuenta para empezar a descubrir libros."
      : "Ingresa para solicitar libros y consultar tus préstamos.";
    get("#folio-submit-label").textContent = registration
      ? "Crear cuenta"
      : "Iniciar sesión";
    get("#folio-switch-label").textContent = registration
      ? "¿Ya tienes cuenta?"
      : "¿Aún no tienes cuenta?";
    get("#folio-switch-view").textContent = registration
      ? "Inicia sesión"
      : "Regístrate";
    password.autocomplete = registration ? "new-password" : "current-password";
    if (registration) password.setAttribute("minlength", "6");
    else password.removeAttribute("minlength");
    password.value = "";
    password.type = "password";
    toggle.textContent = "Mostrar";
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "Mostrar contraseña");
    status.textContent = "";
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    status.textContent = registration
      ? "Formulario válido. La creación de cuentas estará disponible al conectar el servidor."
      : "Formulario válido. El inicio de sesión estará disponible al conectar el servidor.";
    password.value = "";
  });
  form.addEventListener("input", () => {
    status.textContent = "";
  });
})();
