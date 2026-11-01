const express = require('express');
const router = express.Router();
const libroController = require('../controllers/libroController');

const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
)
router.get('/', libroController.getLibros);

router.post('/', verifyToken, isAdmin, libroController.createLibro);
router.put('/:id', verifyToken, isAdmin, libroController.updateLibro);
router.delete('/:id', verifyToken, isAdmin, libroController.deleteLibro);

module.exports = router;
