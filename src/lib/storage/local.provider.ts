import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, sep } from 'node:path';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import type { StorageProvider } from './storage.provider.js';
const key = () => new TextEncoder().encode(env.OTP_PEPPER);
function storagePath(objectKey: string) {
  const root = resolve(env.LOCAL_STORAGE_DIR); const path = resolve(root, objectKey);
  if (!path.startsWith(root + sep)) throw new Error('Invalid storage path');
  return path;
}
export const localStorage: StorageProvider = {
  async put(objectKey, bytes) { await mkdir(resolve(env.LOCAL_STORAGE_DIR), { recursive: true }); await writeFile(storagePath(objectKey), bytes, { flag: 'wx', mode: 0o600 }); },
  async remove(objectKey) { await unlink(storagePath(objectKey)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; }); },
  async url(_objectKey, fileId) {
    const token = await new SignJWT({ fileId }).setProtectedHeader({ alg: 'HS256' }).setIssuer('medimatrix-files').setAudience('download').setExpirationTime('5m').sign(key());
    return `${env.API_BASE_URL}/api/v1/files/${fileId}/download?token=${encodeURIComponent(token)}`;
  },
  read: (objectKey) => createReadStream(storagePath(objectKey)),
};
export async function verifyDownload(token: string, id: string) {
  const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'], issuer: 'medimatrix-files', audience: 'download' });
  return payload.fileId === id;
}
