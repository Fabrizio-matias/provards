const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticar } = require('../middlewares/authMiddleware');
const { autorizarPerfis } = require('../middlewares/roleMiddleware');

router.use(autenticar);

// Apenas Administradores podem gerenciar usuários
router.get('/', autorizarPerfis('admin'), usuarioController.listar);
router.post('/', autorizarPerfis('admin'), usuarioController.criar);
router.patch('/:id', autorizarPerfis('admin'), usuarioController.atualizar);

module.exports = router;
