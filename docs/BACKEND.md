# Conexión pendiente del backend — FOLIO

Estado: **solo frontend**. No hay llamadas a una API, conexión a MySQL ni autenticación real. Las rutas de este documento son un contrato propuesto para la siguiente etapa, no endpoints implementados. No ejecutar la demostración con datos o contraseñas reales.

## Ejecutar y probar

```sh
npm ci
npm run dev:frontend
# http://127.0.0.1:4173
npm test
```

El servidor de prueba sirve únicamente `public/` por loopback; no utiliza `src/server.js`. `FRONTEND_PORT` permite cambiar el puerto. Usar siempre el mismo origen: `localhost`, `127.0.0.1`, otro puerto y `file://` no comparten datos locales. El acceso necesita Web Crypto: abrir mediante HTTP local.

Cuentas ficticias: `lector@example.com` y `admin@example.com`, ambas con `Demo123!`. El registro permite crear otro lector; el administrador puede crear usuarios con una contraseña inicial. No se incluyen cuentas reales. Las demás cuentas semilla usan la misma clave de demostración.

## Mapa de pantallas

| Página                        | Uso                                                                          | JS principal   |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------- |
| `public/index.html`           | Inicio, selección de cuatro libros, búsqueda, categorías, enlace al catálogo | `index.js`     |
| `public/login.html`           | Acceso y alternancia al registro; regreso al libro elegido                   | `login.js`     |
| `public/registro.html`        | Mismo formulario y diseño, inicialmente en registro                          | `login.js`     |
| `public/libros.html`          | Catálogo, 20 libros por página como máximo, filtros y ficha                  | `catalogo.js`  |
| `public/prestamos.html`       | Mesa personal, filtros, detalle e historial                                  | `prestamos.js` |
| `public/admin/libros.html`    | CRUD de colección                                                            | `admin.js`     |
| `public/admin/prestamos.html` | Listado, aprobación y devolución                                             | `admin.js`     |
| `public/admin/usuarios.html`  | CRUD de usuarios                                                             | `admin.js`     |

Las tres entradas de administración comparten el panel. Sus enlaces internos usan `#libros`, `#prestamos` y `#usuarios`; también se puede entrar directamente por cada HTML. Los formularios con cambios piden conservarlos o descartarlos al navegar dentro del panel o cerrar sesión, y activan la advertencia nativa al abandonar la página.

## Dónde sustituir la simulación

Orden de carga actual: `libros-data.js` → `prestamos-data.js` → `admin-model.js` → `folio-client.js` → script de la pantalla. Todos están en `public/js/` y usan `defer`.

`folio-client.js` concentra sesión, acceso, registro, navegación y solicitudes. `admin-model.js` concentra las mutaciones locales de la colección, usuarios y préstamos. Las pantallas públicas también leen ese modelo; por eso un cambio administrativo aparece en el catálogo o mesa al abrirlos de nuevo.

| Función actual                      | Sustitución futura                                                    |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| `FolioClient.session()`             | Obtener usuario autenticado desde `/api/auth/me`                      |
| `login(email, password)`            | Enviar credenciales a login y conservar sesión del servidor           |
| `register({nombre,email,password})` | Registro público con rol forzado a `usuario`                          |
| `logout()`                          | Invalidar sesión del servidor y volver a acceso                       |
| `books()`                           | Obtener catálogo público                                              |
| `myLoans()`                         | Obtener únicamente préstamos del usuario autenticado                  |
| `requestLoan(libro_id)`             | Crear solicitud; usuario, código, fecha y estado los fija el servidor |
| `model().data`                      | Cargar libros, usuarios y préstamos para administración               |
| `saveBook(id, values)`              | POST si no hay id; PUT si existe                                      |
| `saveUser(id, values)`              | POST/PUT de usuarios; contraseña inicial solo al crear                |
| `remove('books'                     | 'users', id)`                                                         | DELETE con comprobación de historial |
| `approveLoan(id)`                   | Aprobación atómica                                                    |
| `returnLoan(id, fecha)`             | Devolución atómica; mapear `fecha` a `fecha_devolucion`               |
| `undo()`, `reset()`                 | **Solo demo. Retirar estos controles al conectar la API**             |

Las lecturas del catálogo, mesa y panel, y las mutaciones administrativas, son síncronas ahora. Al sustituirlas por `fetch`, convertir sus inicializaciones y `complete()` en asíncronas, mostrar carga/error/reintentar, bloquear envíos en curso y actualizar datos tras confirmar la respuesta. `login.js` ya usa `async/await`. No basta con cambiar una URL: las pantallas aún no consumen respuestas HTTP.

`safeReturn()` limita el parámetro `volver` a páginas locales conocidas y conserva únicamente `q`, `categoria`, `libro`, `prestamo`. Mantener esta validación. `go()` resuelve rutas respecto de `public/`, también desde administración. El regreso al catálogo nunca solicita un préstamo automáticamente: el lector debe pulsar Solicitar.

## Variables y campos

Mantener los nombres españoles del SQL y las respuestas. IDs numéricos positivos, cantidades enteras, fechas `YYYY-MM-DD` o `null`; nunca fechas formateadas para pantalla ni cadenas `"null"`.

### Usuario

```json
{
  "id": 1,
  "nombre": "Lector de ejemplo",
  "email": "lector@example.com",
  "rol": "usuario"
}
```

`nombre`: obligatorio, 1–255 caracteres. `email`: obligatorio, válido, único, normalizado a minúsculas, hasta 255. `rol`: exactamente `usuario` o `admin`. Registro público siempre `usuario`, aunque el cliente intente enviar otro rol.

Entrada de registro/creación administrativa: `{nombre,email,password}`; administración añade `rol`. Edición administrativa: `{nombre,email,rol}` y no modifica la contraseña. `password`: mínimo 6 caracteres, máximo 72 bytes UTF-8 para evitar truncamiento con bcrypt. El frontend aplica este límite en creación. Al conectar API, enviar `password` por HTTPS para que **el servidor** lo procese con bcrypt. Nunca devolver `password` ni hashes en los JSON de usuarios.

### Libro

```json
{
  "id": 4,
  "titulo": "El principito",
  "autor": "Antoine de Saint-Exupéry",
  "categoria": "Literatura",
  "cantidad": 4,
  "descripcion": "Descripción editorial opcional."
}
```

`titulo`, `autor`, `categoria`: obligatorios, 1–255 caracteres. `cantidad`: **ejemplares disponibles**, entero entre 0 y 2147483647. Cero es válido y muestra No disponible. Las categorías se derivan del catálogo, incluidas las nuevas.

El SQL actual no contiene `descripcion`; el frontend sí permite editarla (0–2000 caracteres) y la muestra en fichas. Añadir esa columna opcional o acordar otra fuente antes de conectar. `color`, `tinta`, `marca` son metadatos opcionales de las portadas editoriales de prueba; pueden permanecer como presentación local, con valores de respaldo. No son campos obligatorios de negocio ni una URL de portada real.

### Préstamo

```json
{
  "id": 206,
  "codigo": "A1B2C3D4",
  "usuario_id": 1,
  "libro_id": 4,
  "fecha_prestamo": "2026-10-31",
  "fecha_devolucion": null,
  "estado": "pendiente"
}
```

`codigo`: ocho caracteres hexadecimales en mayúsculas; generar con `crypto.randomBytes(4).toString('hex').toUpperCase()` y garantizar unicidad en BD. Los enums son exactamente `pendiente`, `prestado`, `devuelto`. No existen cancelación, rechazo ni renovación en este frontend.

Compatibilidad con el esquema actual: mientras esté pendiente, `fecha_prestamo` representa la fecha de solicitud. Al aprobar, la demo copia esa fecha a `fecha_solicitud` y cambia `fecha_prestamo` a hoy (Lima). **`fecha_solicitud` no existe en el SQL actual**: añadirla si se desea conservar la fecha original, o mantener temporalmente esta semántica y documentar la pérdida de ese dato. No confundir `fecha_devolucion` (devolución real) con una fecha límite; el frontend no inventa vencimientos o multas.

Para la mesa, se necesitan libros asociados y el usuario autenticado. Propuesta inicial: `GET /api/prestamos/mis` devuelve `data` de préstamos y `included.libros` de los libros relacionados, incluso si el catálogo se pagina; así ningún préstamo desaparece por no tener su libro en la primera página.

## Contrato HTTP propuesto

Base `/api`, JSON. Éxito `{ "data": ... }`; listas `{ "data": [], "meta": {"page":1,"pageSize":20,"total":30} }` si se pagina en servidor. Error `{ "error": {"code":"SIN_STOCK","message":"Este libro no tiene ejemplares disponibles.","fields":{}} }`. `fields` es opcional. Los controles actuales paginan arrays completos; elegir cargar colección completa o adaptar listado, filtros y categorías a paginación remota. No paginar dos veces el mismo resultado.

| Método y ruta                   | Entrada                                                      | Acceso / respuesta                                                |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| POST `/auth/registro`           | `{nombre,email,password}`                                    | Público, 201 y usuario; inicia sesión para conservar flujo actual |
| POST `/auth/login`              | `{email,password}`                                           | Público, 200 y usuario                                            |
| GET `/auth/me`                  | —                                                            | Usuario actual; 401 si no hay sesión                              |
| POST `/auth/logout`             | —                                                            | Invalidar sesión, 204                                             |
| GET `/libros`                   | Query opcional `q,categoria,disponibles,orden,page,pageSize` | Público, colección; máximo visual 20 por página                   |
| GET `/libros/:id`               | —                                                            | Público, ficha o 404                                              |
| POST `/libros`                  | `{titulo,autor,categoria,cantidad,descripcion?}`             | Admin, 201 y libro                                                |
| PUT `/libros/:id`               | Los mismos campos                                            | Admin, 200 y libro                                                |
| DELETE `/libros/:id`            | —                                                            | Admin, 204 o 409 si tiene historial                               |
| POST `/prestamos`               | `{libro_id}`                                                 | Lector, 201 y préstamo pendiente                                  |
| GET `/prestamos/mis`            | —                                                            | Lector, sus préstamos y libros relacionados                       |
| GET `/prestamos`                | Query opcional `q,estado`                                    | Admin, todos los préstamos                                        |
| PATCH `/prestamos/:id/aprobar`  | `{}`                                                         | Admin, 200 y préstamo actualizado                                 |
| PATCH `/prestamos/:id/devolver` | `{fecha_devolucion}`                                         | Admin, 200 y préstamo actualizado                                 |
| GET `/usuarios`                 | Query opcional `q,rol`                                       | Admin, usuarios sin credenciales                                  |
| POST `/usuarios`                | `{nombre,email,password,rol}`                                | Admin, 201 y usuario                                              |
| PUT `/usuarios/:id`             | `{nombre,email,rol}`                                         | Admin, 200 y usuario                                              |
| DELETE `/usuarios/:id`          | —                                                            | Admin, 204 o 409                                                  |

Definir `/prestamos/mis` antes de una eventual ruta `/:id`. Aprobación y CRUD de usuarios completan los flujos que necesitan las vistas; no afirmar que ya están implementados en los archivos vacíos de rutas.

Errores esperados: 400/422 datos inválidos; 401 sin sesión/caducada (volver a login preservando destino); 403 rol incorrecto; 404 recurso inexistente; 409 correo duplicado, solicitud duplicada, falta de stock, estado ya cambiado, último admin o registro con historial; 500 error interno sin exponer SQL. En fallo de red o 5xx, conservar formulario y ofrecer reintentar. No sustituir silenciosamente una API fallida por datos demo.

## Reglas que debe garantizar el servidor

1. `pendiente → prestado → devuelto`. No aprobar dos veces, devolver pendiente o devolver dos veces.
2. Solicitar no descuenta inventario; aprobar descuenta exactamente 1 y devolver repone exactamente 1.
3. Comprobar stock al solicitar **y otra vez al aprobar**; varias solicitudes pendientes no reservan ejemplares.
4. Stock, transición y validación se realizan dentro de una transacción con bloqueo o actualización condicional. Las comprobaciones locales no resuelven concurrencia real.
5. Impedir dos préstamos pendientes/activos del mismo usuario y libro; permitir otra solicitud después de devuelto.
6. Obtener `usuario_id` de la sesión. Ignorar el rol, código, estado, fecha y usuario que intente imponer el lector.
7. Registrar fechas de negocio según `America/Lima`. Devolución: fecha válida, entre fecha de préstamo y hoy, inclusive.
8. Bloquear borrar libros o usuarios con cualquier préstamo, incluso devuelto, para conservar historial.
9. Mantener al menos un admin y bloquear que el admin elimine su propia cuenta o cambie su propio rol en esta sesión.
10. No exponer préstamos de otra cuenta. La validación de rutas y roles en JS solo guía la interfaz.

El SQL actual usa `ON DELETE CASCADE`; entra en conflicto con la protección de historial. Cambiar las FK a RESTRICT o imponer la restricción de forma transaccional antes de borrar. Añadir índice UNIQUE a `prestamos.codigo` y validaciones de stock/estados que procedan.

## Sesión y demostración

La demo guarda la BD bajo `folio.admin.demo.v1` y una sesión `{usuario_id,expires}` de ocho horas bajo `folio.session.demo.v1` en localStorage. Las contraseñas introducidas se convierten a un digest SHA-256 **solo para la prueba local**, bajo `demo_password_hash`. Esos datos y las comprobaciones de roles se pueden manipular: no constituyen autenticación ni autorización.

En backend, eliminar esos mecanismos; no importar sus hashes ni usar las cuentas semilla públicas. Si se mantiene JWT, emitirlo desde el servidor. Propuesta: cookie HttpOnly, Secure en producción, SameSite y protección CSRF en operaciones que cambian datos. No guardar el token real en localStorage. Ajustar CORS al origen permitido si frontend y API se sirven separados.

Las variables públicas de pantalla (`state.query`, `category`, `available`, `sort`, `page`, `selectedStatus`, `state.filter`, `state.editor`, `state.dirty`) son estado de presentación, no columnas de BD. El formulario de devolución llama `fecha` al input; el contrato usa `fecha_devolucion`. El digest demo nunca se envía al endpoint real: enviar `password` y retirar `userCredentials()` de la ruta de creación administrativa al migrarla.

## Pendientes reales de la siguiente etapa

`src/models`, controladores, rutas y middleware están sin implementar. `.env.example` también está vacío. El responsable del backend debe definir y documentar sus variables de entorno (propuesta: `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `NODE_ENV`), sin poner secretos en `public/`.

`src/server.js` importa esos módulos vacíos, por lo que `npm start` aún no es una forma de probar el frontend. Además usa `app.get('*', ...)`, incompatible con la sintaxis de comodines de Express 5 instalada: revisar el fallback al implementar servidor, dejando 404 JSON para `/api` y evitando devolver HTML como respuesta de un endpoint inexistente. No se modificó el backend en esta etapa.

Antes de dar por conectada la API, repetir la matriz de `PRUEBAS_FRONTEND.md` contra servidor y BD reales, incluyendo dos aprobaciones concurrentes del último ejemplar, sesión caducada, errores de red y persistencia después de reiniciar servidor. Los tests de ahora comprueban la simulación y el DOM, no esas garantías de servidor.
