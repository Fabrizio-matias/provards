/**
 * Middleware centralizado de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  console.error('Erro na requisição:', err);

  // Erros do Multer (ex: arquivo muito grande)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Arquivo muito grande. O tamanho máximo permitido é 25MB.',
      });
    }
    return res.status(400).json({
      sucesso: false,
      mensagem: `Erro no upload: ${err.message}`,
    });
  }

  // Erros de validação do Mongoose
  if (err.name === 'ValidationError') {
    const mensagens = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      sucesso: false,
      mensagem: mensagens.join('. '),
      detalhes: mensagens,
    });
  }

  // Erros de chave duplicada do Mongo
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({
      sucesso: false,
      mensagem: `Já existe um registro com este valor para o campo: ${campo}.`,
    });
  }

  // Erros de conversão de ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      sucesso: false,
      mensagem: 'Identificador fornecido é inválido.',
    });
  }

  // Erro genérico
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    sucesso: false,
    mensagem: err.message || 'Ocorreu um erro interno no servidor.',
  });
}

module.exports = errorHandler;
