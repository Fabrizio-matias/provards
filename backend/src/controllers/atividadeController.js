const Atividade = require('../models/Atividade');

/**
 * Lista o histórico de atividades e auditoria do sistema
 */
async function listar(req, res, next) {
  try {
    const { acao, usuarioId, provaId, limit = 50, page = 1 } = req.query;

    const filtro = {};

    // Se for professor, apenas atividades das suas provas ou realizadas por ele
    if (req.usuario.perfil === 'professor') {
      filtro.$or = [{ usuarioId: req.usuario._id }];
    } else {
      if (acao) filtro.acao = acao;
      if (usuarioId) filtro.usuarioId = usuarioId;
      if (provaId) filtro.provaId = provaId;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const limiteNumerico = parseInt(limit, 10);

    const [total, atividades] = await Promise.all([
      Atividade.countDocuments(filtro),
      Atividade.find(filtro)
        .populate('usuarioId', 'nome email perfil')
        .populate('provaId', 'codigo titulo turma disciplina')
        .populate('versaoId', 'numero')
        .sort({ dataHora: -1 })
        .skip(skip)
        .limit(limiteNumerico),
    ]);

    res.json({
      sucesso: true,
      total,
      pagina: parseInt(page, 10),
      totalPaginas: Math.ceil(total / limiteNumerico) || 1,
      atividades,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
};
