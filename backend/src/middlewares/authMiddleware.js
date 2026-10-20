const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_padrao_dev_sistema_provas_2026';

/**
 * Middleware para validar o token JWT nas requisições
 */
async function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Acesso não autorizado. Token de autenticação não fornecido.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token inválido ou expirado. Por favor, faça login novamente.',
      });
    }

    const usuario = await Usuario.findById(decoded.id).select('-senha');

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário associado a este token não foi encontrado.',
      });
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Usuário inativo. Entre em contato com a administração.',
      });
    }

    // Injeta dados do usuário na requisição
    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  autenticar,
  JWT_SECRET,
};
