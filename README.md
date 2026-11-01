# 📚 Sistema de Gestión de Biblioteca Web

Sistema web completo para la administración y gestión de una biblioteca digital, con autenticación de usuarios basada en roles (Admin/Usuario), catálogo interactivo de libros y control de préstamos con generación de códigos únicos.

Proyecto desarrollado para el **Producto Académico N.º 4 - Diseño Web**.

---

## 🛠️ Tecnologías Utilizadas

* **Backend:** Node.js, Express.js
* **Base de Datos & ORM:** MySQL, Sequelize ORM
* **Autenticación & Seguridad:** JSON Web Tokens (JWT), Bcrypt, Crypto
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6)
* **Control de Versiones:** Git, GitHub

---

## 📁 Estructura del Proyecto

```text
biblioteca-web/
├── src/
│   ├── config/          # Configuración de conexión a la BD (database.js)
│   ├── controllers/     # Lógica de negocio (auth, libros, prestamos, usuarios)
│   ├── middlewares/     # Middlewares de autenticación y verificación de roles
│   ├── models/          # Modelos Sequelize (Usuario, Libro, Prestamo)
│   ├── routes/          # Definición de rutas de la API RESTful
│   ├── utils/           # Generación de códigos de préstamo únicos (crypto)
│   ├── app.js           # Configuración del servidor Express
│   └── server.js        # Punto de entrada principal e inicio del servidor
├── public/              # Archivos de interfaz web (HTML, CSS, JS frontend)
├── sql/                 # Script SQL para la base de datos MySQL (biblioteca.sql)
├── docs/                # Diagramas ER y colección de endpoints
├── .env.example         # Plantilla de variables de entorno
├── .gitignore           # Archivos ignorados por Git
└── package.json         # Dependencias y scripts del proyecto
