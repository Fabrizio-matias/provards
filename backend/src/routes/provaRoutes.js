const express = require('express');
const router = express.Router();
const provaController = require('../controllers/provaController');
const { autenticar } = require('../middlewares/authMiddleware');
const { autorizarPerfis } = require('../middlewares/roleMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Todas as rotas de provas exigem autenticação
router.use(autenticar);

// Listagem de provas
router.get('/', provaController.listar);

// Cadastro de nova prova (Professores ou Admin)
router.post(
  '/',
  autorizarPerfis('professor', 'admin'),
  upload.single('arquivo'),
  provaController.criar
);

// Obter detalhes de uma prova
router.get('/:id', provaController.obterPorId);

// Atualizar informações cadastrais
router.patch(
  '/:id',
  autorizarPerfis('professor', 'setor_provas', 'admin'),
  provaController.atualizar
);

// Histórico de versões
router.get('/:id/versoes', provaController.listarVersoes);

// Envio de nova versão corrigida pelo setor (Setor de Provas ou Admin)
router.post(
  '/:id/versoes',
  autorizarPerfis('setor_provas', 'admin'),
  upload.single('arquivo'),
  provaController.adicionarVersao
);

module.exports = router;
