const { Libro } = require('../models');
// 1. GET /libros 
exports.getLibros = async (req, res) => {
    try {
        const { titulo } = req.query;
        let whereClause = {};

        // Si envían ?titulo=algo, filtramos
        if (titulo) {
            whereClause.titulo = { [require('sequelize').Op.like]: `%${titulo}%` };
        }

        const libros = await Libro.findAll({ where: whereClause });
        res.json(libros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. POST /libros 
exports.createLibro = async (req, res) => {
    try {
        const { titulo, autor, categoria, cantidad } = req.body;
        const nuevoLibro = await Libro.create({ titulo, autor, categoria, cantidad });
        res.status(201).json(nuevoLibro);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. PUT /libros/:id
exports.updateLibro = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Libro.update(req.body, { where: { id } });
        
        if (updated) {
            const libroActualizado = await Libro.findByPk(id);
            return res.json(libroActualizado);
        }
        res.status(404).json({ message: 'Libro no encontrado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE /libros/:id 
exports.deleteLibro = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Libro.destroy({ where: { id } });
        
        if (deleted) return res.json({ message: 'Libro eliminado correctamente' });
        res.status(404).json({ message: 'Libro no encontrado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
