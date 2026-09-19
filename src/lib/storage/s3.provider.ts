import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';
import type { StorageProvider } from './storage.provider.js';
const client = (endpoint: string) => new S3Client({ endpoint, region: env.S3_REGION, forcePathStyle: env.S3_FORCE_PATH_STYLE, credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } });
const internal = client(env.S3_ENDPOINT);
const external = client(env.S3_PUBLIC_ENDPOINT);
export const s3Storage: StorageProvider = {
  async put(Key, Body, ContentType) { await internal.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key, Body, ContentType })); },
  async remove(Key) { await internal.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key })); },
  async url(Key) { return getSignedUrl(external, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key, ResponseContentDisposition: 'attachment' }), { expiresIn: 300 }); },
};
