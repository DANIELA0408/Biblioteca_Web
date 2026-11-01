const { Usuario } = require('../models');

exports.obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({ attributes: { exclude: ['password'] } });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, { attributes: { exclude: ['password'] } });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};