const multer = require('multer');

// Usamos memory storage para ser 100% compatível com Serverless Vercel, S3 e Vercel Blob
const storage = multer.memoryStorage();

const allowedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'application/vnd.oasis.opendocument.text', // odt
  'application/zip',
  'application/x-zip-compressed',
];

const fileFilter = (req, file, cb) => {
  // Verificação de extensão e mimetype
  const ext = file.originalname.toLowerCase().split('.').pop();
  const validExtensions = ['pdf', 'docx', 'doc', 'odt', 'zip'];

  if (allowedMimes.includes(file.mimetype) || validExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Tipo de arquivo não suportado. Envie arquivos PDF, DOCX, DOC, ODT ou ZIP.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // Limite de 25MB
  },
  fileFilter,
});

module.exports = upload;
