import { CloudinaryStorageConfig } from './providers/cloudinary';
import { GCPStorageConfig } from './providers/gcp';
import { LocalStorageConfig } from './providers/local';
import { S3StorageConfig } from './providers/s3';

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcp' | 'cloudinary';
  config:
    | LocalStorageConfig
    | S3StorageConfig
    | GCPStorageConfig
    | CloudinaryStorageConfig;
}

export interface StorageProvider {
  upload(
    bucket: string,
    key: string,
    data: Uint8Array | ReadableStream
  ): Promise<void>;
  download(bucket: string, key: string): Promise<Buffer>;
  delete(bucket: string, key: string): Promise<void>;
  list(bucket: string, prefix?: string): Promise<string[]>;
  getUrl(bucket: string, key: string): Promise<string>;
}

export interface StorageFile {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
  url?: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
}
