import { StorageConfig, StorageProvider, UploadOptions } from './types';
import { LocalStorageConfig, LocalStorageProvider } from './providers/local';
import { S3StorageConfig, S3StorageProvider } from './providers/s3';
import { GCPStorageConfig, GCPStorageProvider } from './providers/gcp';
import {
  CloudinaryStorageConfig,
  CloudinaryStorageProvider,
} from './providers/cloudinary';

export class StorageService {
  private provider: StorageProvider;

  constructor(config: StorageConfig) {
    this.provider = this.createProvider(config);
  }

  private createProvider(config: StorageConfig): StorageProvider {
    switch (config.provider) {
      case 'local':
        return new LocalStorageProvider(config.config as LocalStorageConfig);
      case 's3':
        return new S3StorageProvider(config.config as S3StorageConfig);
      case 'gcp':
        return new GCPStorageProvider(config.config as GCPStorageConfig);
      case 'cloudinary':
        return new CloudinaryStorageProvider(
          config.config as CloudinaryStorageConfig
        );
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  async upload(
    bucket: string,
    key: string,
    data: Uint8Array | ReadableStream,
    options?: UploadOptions
  ): Promise<void> {
    await this.provider.upload(bucket, key, data);
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    return await this.provider.download(bucket, key);
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.provider.delete(bucket, key);
  }

  async list(bucket: string, prefix?: string): Promise<string[]> {
    return await this.provider.list(bucket, prefix);
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    return await this.provider.getUrl(bucket, key);
  }

  getProvider(): StorageProvider {
    return this.provider;
  }
}
