const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'O nome é obrigatório'],
      trim: true,
      minlength: [2, 'O nome deve ter pelo menos 2 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'O e-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Por favor, informe um e-mail válido',
      ],
    },
    senha: {
      type: String,
      required: [true, 'A senha é obrigatória'],
      minlength: [6, 'A senha deve ter pelo menos 6 caracteres'],
      select: false, // Não retorna a senha nas consultas normais
    },
    perfil: {
      type: String,
      enum: {
        values: [
          'professor',
          'setor_provas',
          'responsavel_aprovacao',
          'coordenacao',
          'admin',
        ],
        message: 'Perfil de usuário inválido',
      },
      required: [true, 'O perfil é obrigatório'],
    },
    disciplinaPadrao: {
      type: String,
      trim: true,
      default: '',
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash de senha antes de salvar
UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método para comparar senha fornecida com o hash
UsuarioSchema.methods.compararSenha = async function (senhaCandidata) {
  return bcrypt.compare(senhaCandidata, this.senha);
};

// Remover senha das conversões JSON
UsuarioSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.senha;
  return obj;
};

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);
