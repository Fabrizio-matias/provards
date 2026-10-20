const path = require('path');
const fs = require('fs');
const Prova = require('../models/Prova');
const Versao = require('../models/Versao');
const storageService = require('../services/storageService');
const { registrarAtividade } = require('../services/auditService');

/**
 * Inicia a conferência de uma prova pelo Setor de Provas
 */
async function iniciarConferencia(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    prova.status = 'EM_CONFERENCIA';
    prova.conferidoPor = req.usuario._id;
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'INICIO_CONFERENCIA',
      descricao: `Conferência iniciada para a prova ${prova.codigo}.`,
      provaId: prova._id,
    });

    res.json({
      sucesso: true,
      mensagem: 'Conferência iniciada com sucesso.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sinaliza que a prova está aguardando correções identificadas pelo setor
 */
async function solicitarCorrecao(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    prova.status = 'AGUARDANDO_CORRECAO';
    if (motivo) {
      prova.observacoes = motivo;
    }
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'SOLICITACAO_CORRECAO',
      descricao: `Prova ${prova.codigo} marcada como aguardando correção. Motivo: ${motivo || 'Não informado'}.`,
      provaId: prova._id,
    });

    res.json({
      sucesso: true,
      mensagem: 'Prova marcada como aguardando correção.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Encaminha versão da prova para validação do professor
 */
async function encaminharValidacao(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    prova.status = 'AGUARDANDO_VALIDACAO_PROFESSOR';
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'ENCAMINHADO_VALIDACAO',
      descricao: `Prova ${prova.codigo} encaminhada para validação de conteúdo pelo professor.`,
      provaId: prova._id,
    });

    res.json({
      sucesso: true,
      mensagem: 'Prova encaminhada para validação do professor.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Validação do Professor: aprova o conteúdo da versão revisada
 * Nota: A aprovação do professor NÃO substitui a aprovação final do setor nem libera para impressão.
 */
async function validarProfessor(req, res, next) {
  try {
    const { id } = req.params;
    const { parecer } = req.body;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    // Apenas o professor responsável ou admin
    if (
      req.usuario.perfil === 'professor' &&
      prova.professorId.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Você só pode validar avaliações das quais seja o professor responsável.',
      });
    }

    const versao = await Versao.findById(prova.versaoAtualId);
    if (!versao) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Versão atual da prova não encontrada.',
      });
    }

    versao.statusValidacaoProfessor = 'APROVADO';
    versao.parecerProfessor = parecer || 'Conteúdo aprovado pelo professor sem ressalvas.';
    versao.dataValidacaoProfessor = new Date();
    await versao.save();

    // Segue para a fila de aprovação final do setor
    prova.status = 'AGUARDANDO_APROVACAO_FINAL';
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'VALIDACAO_PROFESSOR',
      descricao: `Professor validou o conteúdo da versão V${versao.numero} da prova ${prova.codigo}.`,
      provaId: prova._id,
      versaoId: versao._id,
      metadados: { parecer: versao.parecerProfessor },
    });

    res.json({
      sucesso: true,
      mensagem: 'Conteúdo validado com sucesso pelo professor! Prova encaminhada para aprovação final do setor.',
      prova,
      versao,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Solicitação de ajustes pelo Professor
 */
async function solicitarAjustes(req, res, next) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Por favor, descreva detalhadamente os ajustes necessários.',
      });
    }

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    // Apenas o professor responsável ou admin
    if (
      req.usuario.perfil === 'professor' &&
      prova.professorId.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Você só pode solicitar ajustes em provas das quais seja o responsável.',
      });
    }

    const versao = await Versao.findById(prova.versaoAtualId);
    if (versao) {
      versao.statusValidacaoProfessor = 'AJUSTES_SOLICITADOS';
      versao.parecerProfessor = motivo;
      versao.dataValidacaoProfessor = new Date();
      await versao.save();
    }

    prova.status = 'AJUSTES_SOLICITADOS';
    prova.observacoes = `Ajustes solicitados pelo professor: ${motivo}`;
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'SOLICITACAO_AJUSTES_PROFESSOR',
      descricao: `Professor solicitou ajustes na versão V${versao ? versao.numero : 'atual'} da prova ${prova.codigo}. Motivo: ${motivo}`,
      provaId: prova._id,
      versaoId: versao ? versao._id : null,
      metadados: { motivo },
    });

    res.json({
      sucesso: true,
      mensagem: 'Solicitação de ajustes registrada. O Setor de Provas foi notificado.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Aprovação Final do Setor de Provas
 * Libera exclusivamente a versão atual para impressão!
 */
async function aprovarFinal(req, res, next) {
  try {
    const { id } = req.params;
    const { justificativa } = req.body;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    // Permissão: apenas responsavel_aprovacao ou admin
    if (!['responsavel_aprovacao', 'admin'].includes(req.usuario.perfil)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas o Responsável pela Aprovação Final ou Administrador podem aprovar a prova para impressão.',
      });
    }

    const versao = await Versao.findById(prova.versaoAtualId);
    if (!versao) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Não há versão registrada para esta prova.',
      });
    }

    // Verificação de etapas obrigatórias:
    // Se houve alteração de conteúdo nesta versão, o professor DEVE ter validado!
    if (versao.houveAlteracaoConteudo && versao.statusValidacaoProfessor !== 'APROVADO') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Não é possível aprovar para impressão: esta versão sofreu alteração de conteúdo e ainda aguarda a validação do professor.',
      });
    }

    // Atualiza a versão
    versao.statusAprovacaoFinal = 'APROVADA';
    versao.aprovadoPor = req.usuario._id;
    versao.dataAprovacaoFinal = new Date();
    versao.justificativaAprovacao = justificativa || 'Aprovado conforme especificações e padrões pedagógicos.';
    versao.liberadaImpressao = true;
    await versao.save();

    // Atualiza a prova vinculando explicitamente à versão aprovada
    prova.status = 'APROVADA_PARA_IMPRESSAO';
    prova.versaoAprovadaId = versao._id;
    prova.liberadaParaImpressao = true;
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    // Auditoria
    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'APROVACAO_FINAL',
      descricao: `Aprovação final concedida por ${req.usuario.nome}. Versão V${versao.numero} liberada para impressão.`,
      provaId: prova._id,
      versaoId: versao._id,
      metadados: {
        versaoAprovada: versao.numero,
        dataAprovacao: versao.dataAprovacaoFinal,
        arquivo: versao.arquivo.nomeOriginal,
      },
    });

    res.json({
      sucesso: true,
      mensagem: `Prova ${prova.codigo} (Versão V${versao.numero}) APROVADA COM SUCESSO PARA IMPRESSÃO!`,
      prova,
      versao,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Conclui o processo da prova após impressão/aplicação
 */
async function concluirProva(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    prova.status = 'CONCLUIDA';
    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'CONCLUSAO_PROVA',
      descricao: `Processo da prova ${prova.codigo} concluído.`,
      provaId: prova._id,
    });

    res.json({
      sucesso: true,
      mensagem: 'Prova concluída com sucesso.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * BLOQUEIO DE IMPRESSÃO - REQUISITO 8
 * Fornece download do arquivo de impressão SOMENTE se a versão estiver aprovada.
 * O backend bloqueia veementemente qualquer tentativa de download não autorizado.
 */
async function obterArquivoImpressao(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id)
      .populate('versaoAprovadaId')
      .populate('versaoAtualId');

    if (!prova) {
      return res.status(404).json({ sucesso: false, mensagem: 'Prova não encontrada.' });
    }

    // 1. Verificação rígida de aprovação para impressão
    if (
      !prova.liberadaParaImpressao ||
      !prova.versaoAprovadaId ||
      prova.status !== 'APROVADA_PARA_IMPRESSAO' && prova.status !== 'CONCLUIDA'
    ) {
      return res.status(403).json({
        sucesso: false,
        codigoErro: 'IMPRESSAO_BLOQUEADA',
        mensagem: 'IMPRESSÃO BLOQUEADA: Esta prova não possui autorização final para impressão ou existem etapas pendentes.',
      });
    }

    const versaoAprovada = prova.versaoAprovadaId;

    // 2. A versão aprovada deve ter a flag liberadaImpressao === true
    if (!versaoAprovada.liberadaImpressao) {
      return res.status(403).json({
        sucesso: false,
        codigoErro: 'VERSAO_NAO_LIBERADA',
        mensagem: 'A versão registrada não possui confirmação de liberação para impressão.',
      });
    }

    // 3. Auditoria do download para impressão
    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'DOWNLOAD_IMPRESSAO',
      descricao: `Download do arquivo oficial de impressão da prova ${prova.codigo} (Versão V${versaoAprovada.numero}) realizado por ${req.usuario.nome} (${req.usuario.perfil}).`,
      provaId: prova._id,
      versaoId: versaoAprovada._id,
      metadados: {
        versao: versaoAprovada.numero,
        nomeArquivo: versaoAprovada.arquivo.nomeOriginal,
        tamanhoBytes: versaoAprovada.arquivo.tamanhoBytes,
      },
    });

    // 4. Retorno do arquivo
    // Se for URL externa (Vercel Blob / S3), redireciona ou envia a URL
    if (versaoAprovada.arquivo.url.startsWith('http')) {
      return res.redirect(versaoAprovada.arquivo.url);
    }

    // Se for arquivo local
    const filePath = storageService.obterCaminhoLocal(versaoAprovada.arquivo.storageKey);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, versaoAprovada.arquivo.nomeOriginal);
    } else {
      // Caso arquivo local temporário não exista fisicamente, envia JSON com URL relativa
      return res.json({
        sucesso: true,
        mensagem: 'Arquivo liberado para impressão.',
        url: versaoAprovada.arquivo.url,
        nomeOriginal: versaoAprovada.arquivo.nomeOriginal,
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  iniciarConferencia,
  solicitarCorrecao,
  encaminharValidacao,
  validarProfessor,
  solicitarAjustes,
  aprovarFinal,
  concluirProva,
  obterArquivoImpressao,
};
