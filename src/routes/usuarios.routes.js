const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { verificarToken, esAdmin } = require('../middlewares/auth.middleware');

// Rutas para Usuarios
router.get('/', [verificarToken, esAdmin], usuariosController.obtenerUsuarios);
router.get('/perfil', verificarToken, usuariosController.obtenerPerfil);

module.exports = router;