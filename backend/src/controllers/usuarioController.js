const Usuario = require('../models/Usuario');
const { registrarAtividade } = require('../services/auditService');

/**
 * Lista usuários cadastrados (Admin only)
 */
async function listar(req, res, next) {
  try {
    const { perfil, ativo, busca } = req.query;
    const filtro = {};

    if (perfil) filtro.perfil = perfil;
    if (ativo !== undefined) filtro.ativo = ativo === 'true';
    if (busca) {
      const regex = new RegExp(busca, 'i');
      filtro.$or = [{ nome: regex }, { email: regex }, { disciplinaPadrao: regex }];
    }

    const usuarios = await Usuario.find(filtro)
      .select('-senha')
      .sort({ nome: 1 });

    res.json({
      sucesso: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cadastra um novo usuário
 */
async function criar(req, res, next) {
  try {
    const { nome, email, senha, perfil, disciplinaPadrao } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nome, e-mail, senha e perfil são obrigatórios.',
      });
    }

    const existente = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (existente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: 'Já existe um usuário cadastrado com este e-mail.',
      });
    }

    const usuario = await Usuario.create({
      nome,
      email: email.toLowerCase().trim(),
      senha,
      perfil,
      disciplinaPadrao: disciplinaPadrao || '',
      ativo: true,
    });

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'CADASTRO_USUARIO',
      descricao: `Novo usuário ${usuario.nome} (${usuario.email}) criado com o perfil "${usuario.perfil}".`,
      metadados: { novoUsuarioId: usuario._id, perfil: usuario.perfil },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário cadastrado com sucesso.',
      usuario,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Atualiza dados de um usuário (perfil, nome, disciplina, ativação/desativação, senha opcional)
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, email, perfil, disciplinaPadrao, ativo, novaSenha } = req.body;

    const usuario = await Usuario.findById(id).select('+senha');
    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado.',
      });
    }

    // Previne auto-desativação do administrador logado
    if (id === req.usuario._id.toString() && ativo === false) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Você não pode desativar o seu próprio usuário administrador.',
      });
    }

    if (nome) usuario.nome = nome;
    if (email) usuario.email = email.toLowerCase().trim();
    if (perfil) usuario.perfil = perfil;
    if (disciplinaPadrao !== undefined) usuario.disciplinaPadrao = disciplinaPadrao;
    if (ativo !== undefined) usuario.ativo = Boolean(ativo);
    if (novaSenha && novaSenha.trim().length >= 6) {
      usuario.senha = novaSenha.trim();
    }

    await usuario.save();

    await registrarAtividade({
      usuarioId: req.usuario._id,
      acao: 'ATUALIZACAO_USUARIO',
      descricao: `Usuário ${usuario.nome} (${usuario.email}) atualizado. Ativo: ${usuario.ativo}, Perfil: ${usuario.perfil}.`,
      metadados: { usuarioId: usuario._id, perfil: usuario.perfil, ativo: usuario.ativo },
    });

    res.json({
      sucesso: true,
      mensagem: 'Usuário atualizado com sucesso.',
      usuario,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  criar,
  atualizar,
};
