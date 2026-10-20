const mongoose = require('mongoose');

const VersaoSchema = new mongoose.Schema(
  {
    provaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prova',
      required: [true, 'A prova vinculada é obrigatória'],
      index: true,
    },
    numero: {
      type: Number,
      required: [true, 'O número da versão é obrigatório'],
      min: 1,
    },
    arquivo: {
      url: { type: String, required: true },
      nomeOriginal: { type: String, required: true },
      tamanhoBytes: { type: Number, required: true },
      mimetype: { type: String, required: true },
      storageKey: { type: String, required: true },
    },
    enviadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'O usuário que enviou a versão é obrigatório'],
    },
    dataEnvio: {
      type: Date,
      default: Date.now,
    },
    descricaoAlteracoes: {
      type: String,
      default: '',
      trim: true,
    },
    observacoesSetor: {
      type: String,
      default: '',
      trim: true,
    },
    houveAlteracaoConteudo: {
      type: Boolean,
      default: false,
    },
    // Validação do Professor
    statusValidacaoProfessor: {
      type: String,
      enum: ['PENDENTE', 'APROVADO', 'AJUSTES_SOLICITADOS', 'DISPENSADA'],
      default: 'PENDENTE',
    },
    parecerProfessor: {
      type: String,
      default: '',
      trim: true,
    },
    dataValidacaoProfessor: {
      type: Date,
    },
    // Aprovação Final do Setor
    statusAprovacaoFinal: {
      type: String,
      enum: ['PENDENTE', 'APROVADA', 'REJEITADA'],
      default: 'PENDENTE',
    },
    aprovadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    dataAprovacaoFinal: {
      type: Date,
    },
    justificativaAprovacao: {
      type: String,
      default: '',
      trim: true,
    },
    liberadaImpressao: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice composto garantindo unicidade da versão por prova
VersaoSchema.index({ provaId: 1, numero: 1 }, { unique: true });

module.exports = mongoose.models.Versao || mongoose.model('Versao', VersaoSchema);
