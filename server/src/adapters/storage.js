// Storage adapter — swappable file storage (documents → S3 later). Selected by
// STORAGE_DRIVER (stub | s3). The stub is fully functional with no AWS account;
// s3Storage is dropped in when AWS creds are provided (lazy-loaded so the AWS
// SDK is only required when actually used).
import { env } from '../config/env.js';
import { stubStorage } from './stubStorage.js';

let driver = stubStorage;
if (env.storageDriver === 's3') {
  // Lazy import so @aws-sdk/* is only needed when STORAGE_DRIVER=s3.
  const mod = await import('./s3Storage.js').catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[storage] s3 driver unavailable, falling back to stub:', e.message);
    return null;
  });
  if (mod?.s3Storage) driver = mod.s3Storage;
}

// upload({ buffer, filename, contentType, leadId }) → { key, url, size, contentType }
export const upload = (args) => driver.upload(args);
export const getSignedUrl = (key) => driver.getSignedUrl(key);
export const storageDriverName = driver.name;

export default { upload, getSignedUrl, storageDriverName };
