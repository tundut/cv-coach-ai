import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RESUME_LIMITS } from '@cv-coach/shared';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.RESUMES_BUCKET;
  if (!bucket) {
    throw new Error('RESUMES_BUCKET environment variable is not set');
  }
  return bucket;
}

export class S3Service {
  /**
   * Tạo presigned URL để frontend PUT file trực tiếp lên S3.
   * URL có thời hạn ngắn (RESUME_LIMITS.UPLOAD_URL_EXPIRY).
   */
  async getUploadUrl(fileKey: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: getBucket(),
      Key: fileKey,
      ContentType: mimeType,
    });
    return getSignedUrl(getClient(), command, {
      expiresIn: RESUME_LIMITS.UPLOAD_URL_EXPIRY,
    });
  }

  /**
   * Tạo presigned URL để tải/đọc file (dùng cho xử lý sau này).
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: getBucket(),
      Key: fileKey,
    });
    return getSignedUrl(getClient(), command, {
      expiresIn: RESUME_LIMITS.UPLOAD_URL_EXPIRY,
    });
  }

  async deleteObject(fileKey: string): Promise<void> {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: fileKey,
      }),
    );
  }
}
