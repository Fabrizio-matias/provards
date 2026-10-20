const Atividade = require('../models/Atividade');

/**
 * Registra uma ação relevante no log de auditoria
 */
async function registrarAtividade({
  usuarioId,
  acao,
  descricao,
  provaId = null,
  versaoId = null,
  metadados = {},
}) {
  try {
    if (!usuarioId || !acao || !descricao) {
      return null;
    }

    const atividade = await Atividade.create({
      usuarioId,
      acao,
      descricao,
      provaId,
      versaoId,
      metadados,
      dataHora: new Date(),
    });

    return atividade;
  } catch (error) {
    // Logamos o erro de auditoria no console sem quebrar a requisição principal
    console.error('Falha ao registrar atividade de auditoria:', error.message);
    return null;
  }
}

module.exports = {
  registrarAtividade,
};
