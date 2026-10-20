const mongoose = require('mongoose');

const AtividadeSchema = new mongoose.Schema(
  {
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O usuário é obrigatório'],
      index: true,
    },
    acao: {
      type: String,
      required: [true, 'A ação é obrigatória'],
      index: true,
    },
    descricao: {
      type: String,
      required: [true, 'A descrição da atividade é obrigatória'],
    },
    provaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prova',
      index: true,
    },
    versaoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Versao',
    },
    metadados: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dataHora: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Índice para ordenação temporal e paginação
AtividadeSchema.index({ dataHora: -1 });

module.exports = mongoose.models.Atividade || mongoose.model('Atividade', AtividadeSchema);
