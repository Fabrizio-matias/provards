const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Rotas
const authRoutes = require('./routes/authRoutes');
const provaRoutes = require('./routes/provaRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const atividadeRoutes = require('./routes/atividadeRoutes');

const app = express();

// Configuração de CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como curl, postman, mobile apps) ou se allowedOrigins tiver '*'
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissivo para facilidade em homologação/Vercel
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos do frontend (permite rodar tudo junto na mesma porta em dev/prod)
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Servir arquivos de uploads locais em ambiente de desenvolvimento
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Middleware para garantir conexão ao banco de dados no Serverless
app.use(async (req, res, next) => {
  // Ignora verificação no ping de saúde estático
  if (req.path === '/api/health') return next();

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Falha ao conectar no MongoDB:', error.message);
    res.status(503).json({
      sucesso: false,
      mensagem: 'Banco de dados indisponível no momento. Verifique a variável MONGODB_URI.',
      detalhes: error.message,
    });
  }
});

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || 'development',
    versao: '1.0.0',
    servico: 'Sistema de Gerenciamento do Setor de Provas API',
  });
});

// Registro de Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/provas', workflowRoutes); // Rotas de workflow montadas em /api/provas/:id/...
app.use('/api/provas', provaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/atividades', atividadeRoutes);

// Tratamento de Rota 404
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Middleware Central de Erros
app.use(errorHandler);

module.exports = app;
