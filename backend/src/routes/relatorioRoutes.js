const express = require('express');
const router = express.Router();
const relatorioController = require('../controllers/relatorioController');
const { autenticar } = require('../middlewares/authMiddleware');

router.use(autenticar);

router.get('/provas', relatorioController.obterRelatorio);

module.exports = router;
