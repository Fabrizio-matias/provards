require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    console.log('🔄 Inicializando servidor do Sistema de Gestão do Setor de Provas...');
    
    try {
      await connectDB();
      console.log('✅ Banco de dados conectado.');
    } catch (dbErr) {
      console.warn('⚠️ AVISO: Não foi possível conectar ao MongoDB agora.');
      console.warn('👉 Para conectar ao MongoDB Atlas:');
      console.warn('   1. Abra o arquivo backend/.env');
      console.warn('   2. Substitua MONGODB_URI pela string de conexão do seu Cluster no MongoDB Atlas');
      console.warn('   3. Exemplo: mongodb+srv://<usuario>:<senha>@cluster0.abcde.mongodb.net/sistema_provas');
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor web e API ativos na porta ${PORT}!`);
      console.log(`🌐 Acesse o sistema no navegador: http://localhost:${PORT}`);
      console.log(`🔍 Verificação de integridade: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error.message);
    process.exit(1);
  }
}

bootstrap();
