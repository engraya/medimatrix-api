import multer from 'multer';
import { UPLOAD_LIMIT } from '../config/constants.js';
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMIT, files: 1, fields: 0, parts: 1 },
}).single('file');
