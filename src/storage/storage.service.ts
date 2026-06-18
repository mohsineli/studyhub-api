import { Injectable, InternalServerErrorException, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private s3: S3Client | null = null;
  private bucket: string = '';
  private publicUrlBase: string = '';

  constructor(private config: ConfigService) {
    const endpoint = config.get<string>('R2_ENDPOINT');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        requestHandler: { requestTimeout: 30000 },
        // Newer AWS SDK injects a CRC32 checksum into presigned PUT URLs,
        // which breaks direct browser uploads to Cloudflare R2. Only add
        // checksums when the operation actually requires them.
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
      this.bucket = config.get<string>('R2_BUCKET') || '';
      this.publicUrlBase = config.get<string>('R2_PUBLIC_URL') || '';
    }
  }

  private checkConfigured() {
    if (!this.s3) {
      throw new InternalServerErrorException('R2 storage is not configured');
    }
  }

  async getUploadUrl(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    this.checkConfigured();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3!, command, { expiresIn: 7200 });

    // Industry Standard: Return only the raw key, let the frontend prepend its own CDN/public URL.
    return { uploadUrl, publicUrl: key };
  }

  async getObjectStream(key: string): Promise<StreamableFile> {
    this.checkConfigured();

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3!.send(command);
    const stream = response.Body as Readable;
    const fileName = key.split('/').pop() || 'file';

    return new StreamableFile(stream, {
      type: response.ContentType || 'application/octet-stream',
      disposition: `inline; filename="${fileName}"`,
      length: response.ContentLength,
    });
  }

  async deleteObject(key: string): Promise<void> {
    this.checkConfigured();

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3!.send(command);
  }

  async setupCors(): Promise<void> {
    this.checkConfigured();

    const command = new PutBucketCorsCommand({
      Bucket: this.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:8000', this.config.get<string>('FRONTEND_URL')].filter(Boolean) as string[],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });
    await this.s3!.send(command);
  }
}
