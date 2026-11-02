const express = require('express');
const router = express.Router();
const prestamosController = require('../controllers/prestamos.controller');
const { verificarToken, esAdmin } = require('../middlewares/auth.middleware');

// Rutas para Préstamos
router.get('/', [verificarToken, esAdmin], prestamosController.obtenerPrestamos);
router.get('/mis-prestamos', verificarToken, prestamosController.obtenerMisPrestamos);
router.post('/', verificarToken, prestamosController.solicitarPrestamo);
router.put('/:id/estado', [verificarToken, esAdmin], prestamosController.cambiarEstadoPrestamo);

module.exports = router;