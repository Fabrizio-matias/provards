const mongoose = require('mongoose');

/**
 * Global cache para conexões no ambiente Serverless da Vercel
 * Impede que novas conexões sejam abertas a cada invocação de função lambda.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema_provas';

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(' Conectado com sucesso ao MongoDB Atlas/Local');
      return mongooseInstance;
    }).catch((err) => {
      console.error('❌ Erro na conexão com o MongoDB:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;
