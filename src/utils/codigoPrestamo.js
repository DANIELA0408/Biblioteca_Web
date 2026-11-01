const crypto = require('crypto');

/**
 * Genera un código único alfanumérico para los préstamos
 * Ejemplo de salida: "LIB-A1B2C3D4"
 */
const generarCodigoPrestamo = (longitud = 8) => {
  const bytes = crypto.randomBytes(Math.ceil(longitud / 2)).toString('hex').toUpperCase();
  const codigoAleatorio = bytes.slice(0, longitud);
  return `LIB-${codigoAleatorio}`;
};

module.exports = {
  generarCodigoPrestamo
};