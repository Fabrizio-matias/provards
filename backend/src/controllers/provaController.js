const Prova = require('../models/Prova');
const Versao = require('../models/Versao');
const storageService = require('../services/storageService');
const { registrarAtividade } = require('../services/auditService');

/**
 * Gera código sequencial único para a prova: PRV-2026-0001
 */
async function gerarCodigoProva() {
  const ano = new Date().getFullYear();
  const prefixo = `PRV-${ano}-`;
  const ultima = await Prova.findOne({ codigo: new RegExp(`^${prefixo}`) })
    .sort({ createdAt: -1 })
    .select('codigo');

  let seq = 1;
  if (ultima && ultima.codigo) {
    const partes = ultima.codigo.split('-');
    const num = parseInt(partes[2], 10);
    if (!isNaN(num)) {
      seq = num + 1;
    }
  }
  return `${prefixo}${String(seq).padStart(4, '0')}`;
}

/**
 * Lista provas com filtros avançados e paginação
 */
async function listar(req, res, next) {
  try {
    const {
      status,
      trimestre,
      divisao,
      turma,
      disciplina,
      professorId,
      atrasadas,
      busca,
      page = 1,
      limit = 20,
    } = req.query;

    const filtro = {};

    // Restrição por perfil: professor só pode ver suas próprias provas
    if (req.usuario.perfil === 'professor') {
      filtro.professorId = req.usuario._id;
    } else if (professorId) {
      filtro.professorId = professorId;
    }

    if (status) {
      filtro.status = status;
    }

    if (trimestre) {
      filtro.trimestre = trimestre;
    }

    if (divisao) {
      filtro.divisao = divisao;
    }

    if (turma) {
      filtro.turma = turma;
    }

    if (disciplina) {
      filtro.disciplina = disciplina;
    }

    if (atrasadas === 'true') {
      filtro.prazoEntrega = { $lt: new Date() };
      filtro.status = { $nin: ['APROVADA_PARA_IMPRESSAO', 'CONCLUIDA'] };
    }

    if (busca) {
      const regex = new RegExp(busca, 'i');
      filtro.$or = [
        { titulo: regex },
        { codigo: regex },
        { disciplina: regex },
        { turma: regex },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const limiteNumerico = parseInt(limit, 10);

    const [total, provas] = await Promise.all([
      Prova.countDocuments(filtro),
      Prova.find(filtro)
        .populate('professorId', 'nome email disciplinaPadrao')
        .populate('versaoAtualId')
        .populate('versaoAprovadaId')
        .populate('responsavelUltimaAlteracao', 'nome perfil')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limiteNumerico),
    ]);

    res.json({
      sucesso: true,
      total,
      pagina: parseInt(page, 10),
      totalPaginas: Math.ceil(total / limiteNumerico) || 1,
      provas,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtém detalhes completos de uma prova
 */
async function obterPorId(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id)
      .populate('professorId', 'nome email disciplinaPadrao')
      .populate('conferidoPor', 'nome perfil email')
      .populate('versaoAtualId')
      .populate('versaoAprovadaId')
      .populate('responsavelUltimaAlteracao', 'nome perfil');

    if (!prova) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Prova não encontrada.',
      });
    }

    // Validação de acesso do professor
    if (
      req.usuario.perfil === 'professor' &&
      prova.professorId._id.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso não autorizado aos dados desta prova.',
      });
    }

    res.json({
      sucesso: true,
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cadastra uma nova prova e salva a Versão 1 inicial
 */
async function criar(req, res, next) {
  try {
    const {
      titulo,
      disciplina,
      turma,
      trimestre,
      divisao,
      dataAplicacao,
      prazoEntrega,
      observacoes,
      professorId,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'É obrigatório enviar o arquivo da prova (PDF, Word ou ZIP).',
      });
    }

    if (!titulo || !disciplina || !turma || !trimestre || !divisao || !dataAplicacao || !prazoEntrega) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Todos os campos obrigatórios devem ser preenchidos.',
      });
    }

    // Define professor responsável
    let profResponsavelId = req.usuario._id;
    if (req.usuario.perfil === 'admin' && professorId) {
      profResponsavelId = professorId;
    }

    const codigo = await gerarCodigoProva();

    // Salva o arquivo no storage
    const arquivoSalvo = await storageService.salvarArquivo({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      codigoProva: codigo,
      versaoNumero: 1,
    });

    // Cria a prova
    const prova = await Prova.create({
      codigo,
      titulo,
      professorId: profResponsavelId,
      disciplina,
      turma,
      trimestre,
      divisao,
      dataAplicacao: new Date(dataAplicacao),
      prazoEntrega: new Date(prazoEntrega),
      status: 'ENVIADA',
      versaoAtualNumero: 1,
      observacoes: observacoes || '',
      responsavelUltimaAlteracao: req.usuario._id,
      liberadaParaImpressao: false,
    });

    // Cria a Versão 1
    const versao = await Versao.create({
      provaId: prova._id,
      numero: 1,
      arquivo: arquivoSalvo,
      enviadoPor: req.usuario._id,
      descricaoAlteracoes: 'Versão inicial enviada pelo professor.',
      observacoesSetor: '',
      statusValidacaoProfessor: 'APROVADO', // Versão inicial do próprio professor
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    prova.versaoAtualId = versao._id;
    await prova.save();

    // Auditoria
    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'CRIACAO_PROVA',
      descricao: `Prova ${codigo} - "${titulo}" cadastrada e enviada com a Versão 1.`,
      provaId: prova._id,
      versaoId: versao._id,
      metadados: {
        codigo,
        turma,
        disciplina,
        trimestre,
        divisao,
        nomeArquivo: req.file.originalname,
      },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Prova cadastrada e enviada com sucesso.',
      prova,
      versao,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Atualiza dados cadastrais de uma prova
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { titulo, disciplina, turma, trimestre, divisao, dataAplicacao, prazoEntrega, observacoes } = req.body;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Prova não encontrada.',
      });
    }

    // Somente admin, setor ou o próprio professor (se status permitir)
    if (
      req.usuario.perfil === 'professor' &&
      prova.professorId.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado para editar esta prova.',
      });
    }

    if (titulo) prova.titulo = titulo;
    if (disciplina) prova.disciplina = disciplina;
    if (turma) prova.turma = turma;
    if (trimestre) prova.trimestre = trimestre;
    if (divisao) prova.divisao = divisao;
    if (dataAplicacao) prova.dataAplicacao = new Date(dataAplicacao);
    if (prazoEntrega) prova.prazoEntrega = new Date(prazoEntrega);
    if (observacoes !== undefined) prova.observacoes = observacoes;

    prova.responsavelUltimaAlteracao = req.usuario._id;
    await prova.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'ATUALIZACAO_PROVA',
      descricao: `Dados cadastrais da prova ${prova.codigo} atualizados.`,
      provaId: prova._id,
    });

    res.json({
      sucesso: true,
      mensagem: 'Prova atualizada com sucesso.',
      prova,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lista todas as versões de uma prova
 */
async function listarVersoes(req, res, next) {
  try {
    const { id } = req.params;

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Prova não encontrada.',
      });
    }

    if (
      req.usuario.perfil === 'professor' &&
      prova.professorId.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Sem permissão para visualizar as versões desta prova.',
      });
    }

    const versoes = await Versao.find({ provaId: id })
      .populate('enviadoPor', 'nome perfil')
      .populate('aprovadoPor', 'nome perfil')
      .sort({ numero: -1 });

    res.json({
      sucesso: true,
      versoes,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Envia uma nova versão corrigida da prova (V2, V3, etc.)
 * Regra Crítica: "Quando uma nova versão for enviada, as aprovações relacionadas
 * à versão anterior deverão deixar de autorizar a impressão."
 */
async function adicionarVersao(req, res, next) {
  try {
    const { id } = req.params;
    const { descricaoAlteracoes, observacoesSetor, houveAlteracaoConteudo } = req.body;

    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'É obrigatório anexar o arquivo da nova versão.',
      });
    }

    const prova = await Prova.findById(id);
    if (!prova) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Prova não encontrada.',
      });
    }

    // Verifica permissão (setor_provas ou admin)
    if (!['setor_provas', 'admin'].includes(req.usuario.perfil)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Apenas a equipe do Setor de Provas ou Administradores podem enviar novas versões corrigidas.',
      });
    }

    const novoNumero = (prova.versaoAtualNumero || 1) + 1;

    // Salva o arquivo no storage
    const arquivoSalvo = await storageService.salvarArquivo({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      codigoProva: prova.codigo,
      versaoNumero: novoNumero,
    });

    const alteracaoConteudoBool =
      houveAlteracaoConteudo === true ||
      houveAlteracaoConteudo === 'true' ||
      houveAlteracaoConteudo === '1';

    // Cria o documento da nova versão
    const novaVersao = await Versao.create({
      provaId: prova._id,
      numero: novoNumero,
      arquivo: arquivoSalvo,
      enviadoPor: req.usuario._id,
      descricaoAlteracoes: descricaoAlteracoes || 'Correções técnicas e formatação realizadas pelo setor.',
      observacoesSetor: observacoesSetor || '',
      houveAlteracaoConteudo: alteracaoConteudoBool,
      statusValidacaoProfessor: alteracaoConteudoBool ? 'PENDENTE' : 'DISPENSADA',
      statusAprovacaoFinal: 'PENDENTE',
      liberadaImpressao: false,
    });

    // Atualiza a prova
    // INVALIDAÇÃO OBRIGATÓRIA DA IMPRESSÃO DA VERSÃO ANTERIOR:
    prova.versaoAtualNumero = novoNumero;
    prova.versaoAtualId = novaVersao._id;
    prova.versaoAprovadaId = null; // Zera a autorização anterior
    prova.liberadaParaImpressao = false; // Bloqueia impressão
    prova.responsavelUltimaAlteracao = req.usuario._id;

    if (alteracaoConteudoBool) {
      // Se houve alteração de conteúdo, professor DEVE validar
      prova.status = 'AGUARDANDO_VALIDACAO_PROFESSOR';
    } else {
      // Fluxo simplificado permitido no Requisito 6:
      // "Quando não houver correção de conteúdo, permita um fluxo simplificado: após a conferência, a prova poderá seguir diretamente para a aprovação final do setor."
      prova.status = 'AGUARDANDO_APROVACAO_FINAL';
    }

    await prova.save();

    // Auditoria
    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'NOVA_VERSAO',
      descricao: `Nova versão V${novoNumero} enviada para a prova ${prova.codigo}. Alteração de conteúdo: ${alteracaoConteudoBool ? 'Sim' : 'Não'}.`,
      provaId: prova._id,
      versaoId: novaVersao._id,
      metadados: {
        versao: novoNumero,
        arquivo: req.file.originalname,
        descricaoAlteracoes,
        alteracaoConteudo: alteracaoConteudoBool,
      },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: `Versão V${novoNumero} enviada com sucesso. ${
        alteracaoConteudoBool
          ? 'Encaminhada para validação de conteúdo do professor.'
          : 'Encaminhada diretamente para aprovação final do setor.'
      }`,
      prova,
      versao: novaVersao,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obterPorId,
  criar,
  atualizar,
  listarVersoes,
  adicionarVersao,
};
