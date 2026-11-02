const { Usuario } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registro = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({
      nombre,
      email,
      password: hashedPassword,
      rol: rol || 'usuario'
    });
    res.status(201).json({ message: 'Usuario registrado con éxito', usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(password, usuario.password);
    if (!coincide) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '24h' }
    );

    res.json({ message: 'Login exitoso', token, usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};