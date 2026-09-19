import { env } from '../../config/env.js';
import { localStorage } from './local.provider.js';
import { s3Storage } from './s3.provider.js';
export const storage = env.STORAGE_PROVIDER === 's3' ? s3Storage : localStorage;
