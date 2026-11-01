const { Prestamo, Libro, Usuario } = require('../models');
const crypto = require('crypto');

exports.obtenerPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.findAll({ include: [Libro, Usuario] });
    res.json(prestamos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerMisPrestamos = async (req, res) => {
  try {
    const prestamos = await Prestamo.findAll({ where: { usuario_id: req.usuario.id }, include: [Libro] });
    res.json(prestamos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.solicitarPrestamo = async (req, res) => {
  try {
    const { libro_id, fecha_prestamo } = req.body;
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();

    const nuevoPrestamo = await Prestamo.create({
      codigo,
      usuario_id: req.usuario.id,
      libro_id,
      fecha_prestamo,
      estado: 'pendiente'
    });

    res.status(201).json({ message: 'Préstamo solicitado con éxito', prestamo: nuevoPrestamo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cambiarEstadoPrestamo = async (req, res) => {
  try {
    const { estado } = req.body;
    const prestamo = await Prestamo.findByPk(req.params.id);
    if (!prestamo) return res.status(404).json({ message: 'Préstamo no encontrado' });

    await prestamo.update({ estado });
    res.json({ message: 'Estado del préstamo actualizado', prestamo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};