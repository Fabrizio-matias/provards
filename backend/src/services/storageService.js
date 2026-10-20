const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Lazy load para evitar que quebre se SDK não tiver variáveis configuradas
let putBlob = null;
let S3Client = null;
let PutObjectCommand = null;

try {
  const vercelBlob = require('@vercel/blob');
  putBlob = vercelBlob.put;
} catch (e) {
  // Ignora se não estiver instalado ou falhar
}

try {
  const s3Sdk = require('@aws-sdk/client-s3');
  S3Client = s3Sdk.S3Client;
  PutObjectCommand = s3Sdk.PutObjectCommand;
} catch (e) {
  // Ignora
}

class StorageService {
  constructor() {
    this.provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    this.uploadsDir = path.join(__dirname, '../../uploads');

    // Se estiver usando provedor local, assegura existência da pasta uploads
    if (this.provider === 'local') {
      if (!fs.existsSync(this.uploadsDir)) {
        try {
          fs.mkdirSync(this.uploadsDir, { recursive: true });
        } catch (err) {
          console.warn('Aviso ao criar pasta uploads:', err.message);
        }
      }
    }
  }

  /**
   * Salva o arquivo no provedor configurado
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {string} params.originalname
   * @param {string} params.mimetype
   * @param {string} params.codigoProva
   * @param {number} params.versaoNumero
   * @returns {Promise<{url: string, nomeOriginal: string, tamanhoBytes: number, mimetype: string, storageKey: string}>}
   */
  async salvarArquivo({ buffer, originalname, mimetype, codigoProva = 'PROVA', versaoNumero = 1 }) {
    const ext = path.extname(originalname);
    const hash = crypto.randomBytes(6).toString('hex');
    const safeName = `${codigoProva}_V${versaoNumero}_${Date.now()}_${hash}${ext}`;
    const tamanhoBytes = buffer.length;

    // 1. Vercel Blob Storage
    if (this.provider === 'vercel-blob' && process.env.BLOB_READ_WRITE_TOKEN && putBlob) {
      try {
        const blob = await putBlob(`provas/${safeName}`, buffer, {
          access: 'public', // ou private se token suportar
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        return {
          url: blob.url,
          nomeOriginal: originalname,
          tamanhoBytes,
          mimetype,
          storageKey: blob.url,
        };
      } catch (err) {
        console.error('Falha no Vercel Blob, usando fallback local temporário:', err.message);
      }
    }

    // 2. Amazon S3 / Cloudflare R2
    if (this.provider === 's3' && process.env.AWS_S3_BUCKET && S3Client) {
      try {
        const s3 = new S3Client({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const key = `provas/${safeName}`;
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
          })
        );

        const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

        return {
          url,
          nomeOriginal: originalname,
          tamanhoBytes,
          mimetype,
          storageKey: key,
        };
      } catch (err) {
        console.error('Falha no S3, usando fallback local:', err.message);
      }
    }

    // 3. Fallback Local Storage
    // Assegura diretório
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    const filePath = path.join(this.uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${safeName}`;

    return {
      url: fileUrl,
      nomeOriginal: originalname,
      tamanhoBytes,
      mimetype,
      storageKey: safeName,
    };
  }

  /**
   * Retorna o caminho ou URL para leitura do arquivo
   */
  obterCaminhoLocal(storageKey) {
    return path.join(this.uploadsDir, storageKey);
  }
}

module.exports = new StorageService();
