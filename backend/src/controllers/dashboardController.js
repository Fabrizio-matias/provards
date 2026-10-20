const Prova = require('../models/Prova');

/**
 * Retorna métricas e dados agregados em tempo real do MongoDB
 */
async function obterMetricas(req, res, next) {
  try {
    const baseFilter = {};

    // Se for professor, apenas dados das suas provas
    if (req.usuario.perfil === 'professor') {
      baseFilter.professorId = req.usuario._id;
    }

    const agora = new Date();

    const [
      total,
      aguardandoConferencia,
      emConferencia,
      aguardandoCorrecao,
      aguardandoValidacaoProfessor,
      ajustesSolicitados,
      aguardandoAprovacaoFinal,
      aprovadasImpressao,
      concluidas,
      atrasadas,
      porTrimestre,
      porDivisao,
      provasRecentes,
    ] = await Promise.all([
      // Total
      Prova.countDocuments(baseFilter),
      // Por status
      Prova.countDocuments({ ...baseFilter, status: 'AGUARDANDO_CONFERENCIA' }),
      Prova.countDocuments({ ...baseFilter, status: 'EM_CONFERENCIA' }),
      Prova.countDocuments({ ...baseFilter, status: 'AGUARDANDO_CORRECAO' }),
      Prova.countDocuments({ ...baseFilter, status: 'AGUARDANDO_VALIDACAO_PROFESSOR' }),
      Prova.countDocuments({ ...baseFilter, status: 'AJUSTES_SOLICITADOS' }),
      Prova.countDocuments({ ...baseFilter, status: 'AGUARDANDO_APROVACAO_FINAL' }),
      Prova.countDocuments({ ...baseFilter, status: 'APROVADA_PARA_IMPRESSAO' }),
      Prova.countDocuments({ ...baseFilter, status: 'CONCLUIDA' }),
      // Atrasadas
      Prova.countDocuments({
        ...baseFilter,
        prazoEntrega: { $lt: agora },
        status: { $nin: ['APROVADA_PARA_IMPRESSAO', 'CONCLUIDA'] },
      }),
      // Agregação por Trimestre
      Prova.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$trimestre', count: { $sum: 1 } } },
      ]),
      // Agregação por Divisão (AG / AD)
      Prova.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$divisao', count: { $sum: 1 } } },
      ]),
      // Provas recentes
      Prova.find(baseFilter)
        .populate('professorId', 'nome email')
        .populate('versaoAtualId')
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

    // Formata agregações
    const trimestresObj = { '1º': 0, '2º': 0, '3º': 0 };
    porTrimestre.forEach((t) => {
      if (t._id) trimestresObj[t._id] = t.count;
    });

    const divisaoObj = { AG: 0, AD: 0 };
    porDivisao.forEach((d) => {
      if (d._id) divisaoObj[d._id] = d.count;
    });

    res.json({
      sucesso: true,
      metricas: {
        total,
        aguardandoConferencia,
        emConferencia,
        aguardandoCorrecao,
        aguardandoValidacaoProfessor,
        ajustesSolicitados,
        aguardandoAprovacaoFinal,
        aprovadasImpressao,
        concluidas,
        atrasadas,
        trimestres: trimestresObj,
        divisao: divisaoObj,
      },
      provasRecentes,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  obterMetricas,
};
