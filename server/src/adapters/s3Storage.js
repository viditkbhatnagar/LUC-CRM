// Real S3 storage driver. Activated by STORAGE_DRIVER=s3. Requires the AWS SDK:
//   npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// and AWS_REGION / AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
// Imports are dynamic so this module loads even before the SDK is installed
// (storage.js falls back to the stub if these throw).
import { env } from '../config/env.js';

const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
const { getSignedUrl: presign } = await import('@aws-sdk/s3-request-presigner');

const client = new S3Client({
  region: env.aws.region,
  credentials: { accessKeyId: env.aws.accessKeyId, secretAccessKey: env.aws.secretAccessKey },
});

function safeName(name = 'file') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export const s3Storage = {
  name: 's3',
  async upload({ buffer, filename, contentType, leadId }) {
    const key = `leads/${leadId}/${Date.now()}-${safeName(filename)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return { key, url: await s3Storage.getSignedUrl(key), size: buffer?.length ?? 0, contentType };
  },
  async getSignedUrl(key) {
    return presign(client, new GetObjectCommand({ Bucket: env.aws.bucket, Key: key }), {
      expiresIn: 3600,
    });
  },
};

export default s3Storage;
