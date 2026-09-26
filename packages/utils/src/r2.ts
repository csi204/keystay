import type { R2Bucket } from '@cloudflare/workers-types';
import type { AssetUploadResult } from '@keystay/types';

/**
 * Uploads a file/stream to Cloudflare R2 bucket
 * @param bucket R2Bucket binding from Worker env
 * @param file File or Blob or ArrayBuffer to upload
 * @param filename Original filename or prefix
 * @param folder Optional directory prefix (e.g. 'rooms', 'housekeeping', 'receipts')
 */
export async function uploadToR2(
  bucket: R2Bucket,
  file: File | Blob | ArrayBuffer,
  filename: string,
  folder = 'uploads',
): Promise<AssetUploadResult> {
  const extension = filename.includes('.') ? filename.split('.').pop() : 'bin';
  const uniqueKey = `${folder}/${crypto.randomUUID()}.${extension}`;
  
  let data: ArrayBuffer;
  let contentType = 'application/octet-stream';

  if (file instanceof ArrayBuffer) {
    data = file;
  } else {
    data = await file.arrayBuffer();
    if ('type' in file && file.type) {
      contentType = file.type;
    }
  }

  await bucket.put(uniqueKey, data, {
    httpMetadata: {
      contentType,
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      originalName: filename,
    },
  });

  return {
    key: uniqueKey,
    url: `/assets/${uniqueKey}`,
    contentType,
    size: data.byteLength,
  };
}

/**
 * Retrieves an object from Cloudflare R2 bucket
 */
export async function getFromR2(bucket: R2Bucket, key: string) {
  return await bucket.get(key);
}

/**
 * Deletes an object from Cloudflare R2 bucket
 */
export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}
