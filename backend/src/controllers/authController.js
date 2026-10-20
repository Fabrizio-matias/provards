const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { registrarAtividade } = require('../services/auditService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Realiza autenticação do usuário e retorna token JWT
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Por favor, informe e-mail e senha.',
      });
    }

    const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() }).select('+senha');

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas. Verifique seu e-mail e senha.',
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Usuário desativado. Entre em contato com a administração.',
      });
    }

    const senhaCorreta = await usuario.compararSenha(senha);
    if (!senhaCorreta) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Credenciais inválidas. Verifique seu e-mail e senha.',
      });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        perfil: usuario.perfil,
        email: usuario.email,
        nome: usuario.nome,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Registro de auditoria do login
    await registrarAtividade({
      usuarioId: usuario._id,
      acao: 'LOGIN',
      descricao: `Usuário ${usuario.nome} (${usuario.perfil}) realizou login no sistema.`,
      metadados: { ip: req.ip },
    });

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        disciplinaPadrao: usuario.disciplinaPadrao,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retorna dados do usuário atualmente autenticado
 */
async function me(req, res) {
  res.json({
    sucesso: true,
    usuario: {
      id: req.usuario._id,
      nome: req.usuario.nome,
      email: req.usuario.email,
      perfil: req.usuario.perfil,
      disciplinaPadrao: req.usuario.disciplinaPadrao,
    },
  });
}

/**
 * Endpoint de logout
 */
async function logout(req, res) {
  if (req.usuario) {
    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'LOGOUT',
      descricao: `Usuário ${req.usuario.nome} encerrou a sessão.`,
    });
  }
  res.json({
    sucesso: true,
    mensagem: 'Sessão finalizada com sucesso.',
  });
}

module.exports = {
  login,
  me,
  logout,
};
