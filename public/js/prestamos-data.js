// Frontend sample data. These records do not create or modify real loans.
globalThis.FolioLector = {
  id: 1,
  nombre: "Lector de demostración",
  email: "lector@example.com",
};
globalThis.FolioPrestamos = [
  {
    id: 101,
    codigo: "A7F3C91D",
    usuario_id: 1,
    libro_id: 1,
    fecha_prestamo: "2026-10-20",
    fecha_devolucion: null,
    estado: "prestado",
  },
  {
    id: 102,
    codigo: "B2D8E410",
    usuario_id: 1,
    libro_id: 2,
    fecha_prestamo: "2026-10-30",
    fecha_devolucion: null,
    estado: "pendiente",
  },
  {
    id: 103,
    codigo: "C9A14F62",
    usuario_id: 1,
    libro_id: 4,
    fecha_prestamo: "2026-10-10",
    fecha_devolucion: "2026-10-27",
    estado: "devuelto",
  },
  {
    id: 104,
    codigo: "D4E28B73",
    usuario_id: 1,
    libro_id: 3,
    fecha_prestamo: "2026-10-23",
    fecha_devolucion: null,
    estado: "prestado",
  },
  {
    id: 105,
    codigo: "E6B91A05",
    usuario_id: 1,
    libro_id: 12,
    fecha_prestamo: "2026-10-26",
    fecha_devolucion: null,
    estado: "prestado",
  },
];
