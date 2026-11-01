const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const librosRoutes = require('./routes/libros.routes');
const prestamosRoutes = require('./routes/prestamos.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (public)
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/libros', librosRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Ruta principal para servir el cliente web
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Inicialización de la Base de Datos y Servidor
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Base de datos conectada con éxito.');
<<<<<<< HEAD

=======
    
>>>>>>> origin/main
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al conectar la base de datos:', error.message);
<<<<<<< HEAD
    process.exit(1);
=======
>>>>>>> origin/main
  }
}

startServer();