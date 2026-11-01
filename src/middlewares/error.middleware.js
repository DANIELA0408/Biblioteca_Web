// Middleware global para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message || 'Error interno del servidor',
      status: statusCode
    }
  });
};

module.exports = errorHandler;