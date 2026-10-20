const mongoose = require('mongoose');

const ProvaSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    titulo: {
      type: String,
      required: [true, 'O título da avaliação é obrigatório'],
      trim: true,
      minlength: [3, 'O título deve ter pelo menos 3 caracteres'],
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O professor responsável é obrigatório'],
      index: true,
    },
    disciplina: {
      type: String,
      required: [true, 'A disciplina é obrigatória'],
      trim: true,
      index: true,
    },
    turma: {
      type: String,
      required: [true, 'A turma é obrigatória'],
      trim: true,
      index: true,
    },
    trimestre: {
      type: String,
      required: [true, 'O trimestre é obrigatório'],
      enum: {
        values: ['1º', '2º', '3º'],
        message: 'O trimestre deve ser 1º, 2º ou 3º',
      },
      index: true,
    },
    divisao: {
      type: String,
      required: [true, 'A divisão da avaliação (AG ou AD) é obrigatória'],
      enum: {
        values: ['AG', 'AD'],
        message: 'A divisão deve ser AG (Avaliação Geral) ou AD (Avaliação Diversificada)',
      },
      index: true,
    },
    dataAplicacao: {
      type: Date,
      required: [true, 'A data de aplicação da prova é obrigatória'],
    },
    prazoEntrega: {
      type: Date,
      required: [true, 'O prazo de entrega da prova é obrigatório'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'ENVIADA',
        'AGUARDANDO_CONFERENCIA',
        'EM_CONFERENCIA',
        'AGUARDANDO_CORRECAO',
        'AGUARDANDO_VALIDACAO_PROFESSOR',
        'AJUSTES_SOLICITADOS',
        'AGUARDANDO_APROVACAO_FINAL',
        'APROVADA_PARA_IMPRESSAO',
        'CONCLUIDA',
      ],
      default: 'ENVIADA',
      index: true,
    },
    versaoAtualNumero: {
      type: Number,
      default: 1,
    },
    versaoAtualId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Versao',
    },
    versaoAprovadaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Versao',
      default: null,
    },
    conferidoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    observacoes: {
      type: String,
      default: '',
      trim: true,
    },
    responsavelUltimaAlteracao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    liberadaParaImpressao: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compostos para consultas rápidas nos filtros solicitados no requisito 5
ProvaSchema.index({ trimestre: 1, divisao: 1 });
ProvaSchema.index({ turma: 1, trimestre: 1, divisao: 1 });
ProvaSchema.index({ professorId: 1, status: 1 });

module.exports = mongoose.models.Prova || mongoose.model('Prova', ProvaSchema);
