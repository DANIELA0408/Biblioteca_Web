const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Libro = require('./Libro');
const Prestamo = require('./Prestamo');

// Relaciones
Usuario.hasMany(Prestamo, { foreignKey: 'usuario_id' });
Libro.hasMany(Prestamo, { foreignKey: 'libro_id' });
Prestamo.belongsTo(Usuario, { foreignKey: 'usuario_id' });
Prestamo.belongsTo(Libro, { foreignKey: 'libro_id' });

module.exports = { sequelize, Usuario, Libro, Prestamo };