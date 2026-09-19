import { randomUUID, createHash } from 'node:crypto';
import { basename } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { prisma, transaction } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { audit } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { storage } from '../../lib/storage/index.js';
import { AppError, missing, unauthorized } from '../../errors/app-error.js';
import type { Actor } from '../patients/patients.repository.js';
import { filesRepository } from './files.repository.js';
import { verifyDownload } from '../../lib/storage/local.provider.js';
export async function uploadFile(actor: Actor, file?: Express.Multer.File) {
  if (!file) throw new AppError(400, 'FILE_REQUIRED', 'Provide one file');
  const type = await fileTypeFromBuffer(file.buffer);
  if (
    !type ||
    !['application/pdf', 'image/jpeg', 'image/png'].includes(type.mime) ||
    file.mimetype !== type.mime
  )
    throw new AppError(
      415,
      'UNSUPPORTED_FILE',
      'Upload a PDF, JPEG or PNG with matching content type',
    );
  const storageKey = `${randomUUID()}.${type.ext}`;
  const originalName = Array.from(basename(file.originalname.replace(/\\/g, '/')))
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .slice(0, 255);
  await storage.put(storageKey, file.buffer, type.mime);
  try {
    return await prisma.file.create({
      data: {
        ownerUserId: actor.id,
        bucket: env.STORAGE_PROVIDER === 'local' ? 'local' : env.S3_BUCKET,
        storageKey,
        originalName,
        mimeType: type.mime,
        sizeBytes: file.size,
        checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
      },
      select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
    });
  } catch (error) {
    await storage
      .remove(storageKey)
      .catch(() => logger.error({ storageKey }, 'Orphan upload requires cleanup'));
    throw error;
  }
}
export async function fileUrl(actor: Actor, id: string) {
  const row = await transaction(async (tx) => {
    const file = await tx.file.findFirst({
      where: { id, ...(actor.role === 'PATIENT' ? { ownerUserId: actor.id } : {}) },
    });
    if (!file) throw missing();
    if (actor.role !== 'PATIENT') await audit(tx, actor.id, 'DOWNLOAD_URL', 'File', id);
    return file;
  });
  return {
    url: await storage.url(row.storageKey, row.id),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  };
}
export async function localDownload(id: string, token: string) {
  if (env.STORAGE_PROVIDER !== 'local') throw missing();
  try {
    if (!(await verifyDownload(token, id))) throw unauthorized();
  } catch {
    throw unauthorized('DOWNLOAD_EXPIRED');
  }
  const file = await filesRepository.byId(id);
  if (!file) throw missing();
  return { file, stream: storage.read!(file.storageKey) };
}
