import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as createSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET, R2_PUBLIC_URL } from './r2';

/**
 * Generates a presigned GET URL for an object in R2.
 */
export async function getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return await createSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

/**
 * Uploads a file to R2 and returns its public URL.
 */
export async function uploadToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.send(command);
  return `${R2_PUBLIC_URL}/${key}`;
}
