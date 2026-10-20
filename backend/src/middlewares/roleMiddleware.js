/**
 * Middleware para autorização baseada em perfis de usuário
 * @param  {...string} perfisPermitidos - Lista de perfis autorizados para a rota
 */
function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Não autenticado.',
      });
    }

    // Administrador tem acesso global a recursos do sistema
    if (req.usuario.perfil === 'admin') {
      return next();
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Acesso negado. Seu perfil (${req.usuario.perfil}) não possui permissão para executar esta ação.`,
      });
    }

    next();
  };
}

module.exports = {
  autorizarPerfis,
};
