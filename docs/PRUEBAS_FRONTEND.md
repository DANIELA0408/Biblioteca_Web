# Verificación del flujo frontend

Fecha: 31/10/2026. Entorno: Node 24, HTML/CSS/JS, servidor estático local; sin backend ni MySQL.

Resultado automatizado: **12 grupos de pruebas aprobados, 0 fallos**, con `npm test`. Los tests residen en `tests/frontend/`; usan Node test runner, VM, linkedom y un servidor HTTP de prueba con puerto temporal. No modifican datos del navegador del usuario.

## Cortes encontrados y corregidos

- Acceso que solo validaba datos y no continuaba el recorrido: ahora inicia una sesión ficticia y regresa al destino permitido.
- `registro.html` vacío: comparte el diseño y formulario de acceso, inicialmente en registro.
- Solicitud que siempre regresaba a login: crea el préstamo pendiente y abre su detalle; si ya existe, enlaza a la solicitud existente.
- Catálogo, mesa y panel con datos independientes: comparten la misma BD de demostración.
- Categorías nuevas fuera de los filtros/secciones del catálogo: ahora se generan desde los libros actuales.
- Falta de salida de sesión y rutas privadas sin comprobación: se añadieron navegación por rol, cierre y caducidad demo.
- Enlaces de libro/préstamo inexistente sin explicación: muestran aviso y mantienen el acceso al listado.
- Creación administrativa de usuarios sin credencial inicial: el formulario solicita una contraseña de prueba y el nuevo usuario puede ingresar.
- Sesiones del panel con datos anteriores podían sobrescribir cambios de otra pestaña: se releen los datos antes de mutar y se invalida el deshacer obsoleto. Esto no reemplaza transacciones de servidor.
- Formularios administrativos sucios: aviso al cambiar de sección, cerrar editor, cerrar sesión o abandonar la página.
- Dependencias JS: verificación automática de orden único en todas las páginas.

## Matriz automatizada

| Área               | Casos ejercitados                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciclo completo     | Registro → catálogo → solicitud → detalle pendiente → admin aprueba → lector ve Prestado → admin devuelve → lector ve Devuelto, fecha e inventario restituido                                       |
| Acceso             | Credenciales válidas/incorrectas, email normalizado/duplicado/inválido, contraseña corta, registro por submit real, estado de envío y error recuperable                                             |
| Navegación         | Destino del libro preservado, redirecciones locales permitidas, URLs externas o inválidas rechazadas, logout, sesión caducada/corrupta, acceso directo a páginas privadas, lector/admin equivocados |
| Catálogo           | 30 libros, 20/10 por página, límites anterior/siguiente, búsqueda sin tildes, vacío, limpiar, ficha, agotado, solicitud existente, categoría nueva creada en admin reflejada públicamente           |
| Mesa y detalle     | Solo préstamos del lector, filtros por los tres estados y todos, cuenta nueva sin préstamos, abrir/regresar, intento de préstamo ajeno, referencia inexistente, campos del registro                 |
| Iluminación        | Mañana/tarde/noche y saludos del login; tres variantes de mesa; mostrar/ocultar contraseña                                                                                                          |
| Administración     | Tres entradas y menús, crear/editar/borrar libros y usuarios, portada viva, duplicado de correo sin perder formulario, paginación, aprobación, devolución, deshacer y restablecer demo              |
| Reglas             | Cantidad negativa/fraccionaria/vacía/no finita, stock agotado, aprobación/devolución repetida, fechas inválidas/futuras/anteriores, historial protegido, último admin, cuenta propia                |
| Formularios        | Mantener/descartar cambios sin guardar, cerrar sesión con formulario sucio, contraseña inicial administrativa y acceso posterior del usuario creado                                                 |
| Persistencia       | Recargar modelo compartido, almacenamiento no disponible/corrupto, fallo de escritura sin falso éxito de registro/solicitud, modelo obsoleto y deshacer tras cambio ajeno                           |
| Enlaces y recursos | Todas las páginas, scripts únicos y ordenados, IDs sin duplicados, enlaces locales, anclas, imágenes y URLs locales del CSS existentes                                                              |
| HTTP local         | Páginas y scripts 200 con MIME correcto, HEAD sin cuerpo, recurso inexistente 404, POST 405, rutas inválidas 400                                                                                    |

## Prueba en navegador real

Se recorrió mediante controles visibles: inicio → ficha de El principito → acceso de lector → regreso al libro → Solicitar → detalle pendiente → cerrar sesión → acceso admin → Préstamos → buscar código → revisar → confirmar aprobación → registrar devolución → cerrar sesión → lector → mesa → detalle devuelto. Se observaron 4 disponibles al inicio, 3 después de aprobar y 4 después de devolver. Se verificaron el código y las fechas en el historial final. También se inspeccionó la ficha a ancho móvil: contenido apilado, sin desbordamiento horizontal en esa vista.

Las pruebas automatizadas de DOM no sustituyen la inspección visual ni la validación nativa completa de un navegador. El recorrido de navegador se hizo en el navegador integrado; no equivale a una matriz completa de Chrome, Firefox, Safari y dispositivos físicos. Los demás casos de la tabla se ejercitaron en tests, no se presentan como clics manuales en cada navegador.

## Repetición manual rápida

1. `npm run dev:frontend`, abrir la URL impresa y usar cuentas ficticias.
2. Crear lector desde registro. Debe entrar con mesa vacía.
3. Abrir catálogo y solicitar un libro disponible. Comprobar Pendiente y mismo código al volver.
4. Cerrar sesión; entrar como admin, buscar el código en Préstamos y aprobar. Comprobar reducción de stock y estado.
5. Volver al lector y consultar su préstamo. Después regresar al admin y registrar la devolución con fecha válida.
6. Verificar historial Devuelto y stock restituido. Repetir solicitud del mismo libro: permitida tras devolución.
7. Probar agotados, solicitud duplicada, fecha futura, correo duplicado, eliminación con historial y formulario sin guardar.
8. Para empezar otra vez, usar Restablecer demo en admin. Afecta los datos locales de ese origen, no una base real.

## Límites y siguiente etapa

No se prueban endpoints, bcrypt, JWT, cookies, permisos reales, MySQL, concurrencia transaccional o fallos de red de una API porque todavía no existen. La guía de conexión está en `BACKEND.md`. El flujo funciona con datos locales para revisar el frontend; no se considera producción.

Al instalar dependencias, `npm audit` informó cuatro incidencias moderadas en el árbol existente de nodemon/minimatch y Sequelize/uuid. No se aplicaron cambios mayores automáticos a las dependencias del backend; debe revisarse ese árbol al implementar el servidor. Los tests frontend usan Node y linkedom.
