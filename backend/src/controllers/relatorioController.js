const Prova = require('../models/Prova');

/**
 * Gera relatório analítico de provas
 */
async function obterRelatorio(req, res, next) {
  try {
    const { trimestre, divisao, turma, disciplina, status } = req.query;

    const filtro = {};
    if (trimestre) filtro.trimestre = trimestre;
    if (divisao) filtro.divisao = divisao;
    if (turma) filtro.turma = turma;
    if (disciplina) filtro.disciplina = disciplina;
    if (status) filtro.status = status;

    if (req.usuario.perfil === 'professor') {
      filtro.professorId = req.usuario._id;
    }

    const [
      provas,
      porTurma,
      porDisciplina,
      porTrimestre,
      porDivisao,
      porStatus,
    ] = await Promise.all([
      Prova.find(filtro)
        .populate('professorId', 'nome email')
        .populate('versaoAtualId')
        .sort({ dataAplicacao: 1 }),
      Prova.aggregate([
        { $match: filtro },
        { $group: { _id: '$turma', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Prova.aggregate([
        { $match: filtro },
        { $group: { _id: '$disciplina', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Prova.aggregate([
        { $match: filtro },
        { $group: { _id: '$trimestre', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Prova.aggregate([
        { $match: filtro },
        { $group: { _id: '$divisao', total: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Prova.aggregate([
        { $match: filtro },
        { $group: { _id: '$status', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    res.json({
      sucesso: true,
      totalProvas: provas.length,
      resumo: {
        porTurma,
        porDisciplina,
        porTrimestre,
        porDivisao,
        porStatus,
      },
      provas,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  obterRelatorio,
};
