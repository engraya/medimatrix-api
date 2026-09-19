import type { Readable } from 'node:stream';
export interface StorageProvider {
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  url(key: string, fileId: string): Promise<string>;
  read?(key: string): Readable;
}
