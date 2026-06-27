import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

import type { AppConfig } from '../../config/configuration';

/**
 * S3-compatible object storage (MinIO in dev, AWS S3 in prod). Provides
 * presigned URLs so large uploads/downloads bypass the API, plus a direct
 * `putObject` for server-generated files (e.g. report exports).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const s3 = config.get('s3', { infer: true });
    this.bucket = s3.bucket;
    this.publicEndpoint = s3.endpoint.replace(/\/$/, '');
    this.client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      forcePathStyle: s3.forcePathStyle,
      credentials: { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey },
    });
  }

  /** Build a namespaced, collision-resistant object key. */
  buildKey(folder: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${folder.replace(/(^\/|\/$)/g, '')}/${randomUUID()}-${safe}`;
  }

  /** Presigned PUT URL the client uploads to directly. */
  async presignUpload(
    folder: string,
    filename: string,
    contentType: string,
    expiresIn = 900,
  ) {
    const key = this.buildKey(folder, filename);
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
    return { key, uploadUrl: url, publicUrl: this.publicUrl(key) };
  }

  /** Presigned GET URL for private objects. */
  presignDownload(key: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  /** Upload a server-generated buffer (reports, thumbnails, etc.). */
  async putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.publicUrl(key);
  }

  publicUrl(key: string): string {
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }
}
