const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { autenticar } = require('../middlewares/authMiddleware');
const { autorizarPerfis } = require('../middlewares/roleMiddleware');

router.use(autenticar);

// Iniciar conferência no setor
router.post(
  '/:id/iniciar-conferencia',
  autorizarPerfis('setor_provas', 'admin'),
  workflowController.iniciarConferencia
);

// Registrar pendências / solicitar correção
router.post(
  '/:id/solicitar-correcao',
  autorizarPerfis('setor_provas', 'admin'),
  workflowController.solicitarCorrecao
);

// Encaminhar versão para validação do professor
router.post(
  '/:id/encaminhar-validacao',
  autorizarPerfis('setor_provas', 'admin'),
  workflowController.encaminharValidacao
);

// Validação do Professor (aprovação do conteúdo)
router.post(
  '/:id/validar-professor',
  autorizarPerfis('professor', 'admin'),
  workflowController.validarProfessor
);

// Solicitação de ajustes pelo Professor
router.post(
  '/:id/solicitar-ajustes',
  autorizarPerfis('professor', 'admin'),
  workflowController.solicitarAjustes
);

// Aprovação Final pelo Responsável do Setor
router.post(
  '/:id/aprovar-final',
  autorizarPerfis('responsavel_aprovacao', 'admin'),
  workflowController.aprovarFinal
);

// Conclusão da prova
router.post(
  '/:id/concluir',
  autorizarPerfis('setor_provas', 'responsavel_aprovacao', 'admin'),
  workflowController.concluirProva
);

// Download do arquivo de impressão - estritamente protegido pelo Requisito 8
router.get(
  '/:id/arquivo-impressao',
  workflowController.obterArquivoImpressao
);

module.exports = router;
