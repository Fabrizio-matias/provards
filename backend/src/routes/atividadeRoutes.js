const express = require('express');
const router = express.Router();
const atividadeController = require('../controllers/atividadeController');
const { autenticar } = require('../middlewares/authMiddleware');

router.use(autenticar);

router.get('/', atividadeController.listar);

module.exports = router;
