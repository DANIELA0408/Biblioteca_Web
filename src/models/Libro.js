const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Libro = sequelize.define('Libro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  autor: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'libros'
});

module.exports = Libro;