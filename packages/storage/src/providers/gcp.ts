import { StorageProvider } from '../types';
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';

export interface GCPStorageConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export class GCPStorageProvider implements StorageProvider {
  private storage: Storage;

  constructor(config: GCPStorageConfig) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      credentials: config.credentials,
    });
  }

  async upload(
    bucket: string,
    key: string,
    data: Uint8Array | ReadableStream
  ): Promise<void> {
    const file = this.storage.bucket(bucket).file(key);
    if (data instanceof Uint8Array) {
      await file.save(data);
    } else {
      await new Promise((resolve, reject) => {
        const writeStream = file.createWriteStream();
        const reader = data.getReader();

        async function pump() {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            writeStream.write(value);
          }
          writeStream.end();
        }

        pump().then(resolve).catch(reject);
      });
    }
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const file = this.storage.bucket(bucket).file(key);
    const [content] = await file.download();
    return content;
  }

  async delete(bucket: string, key: string): Promise<void> {
    const file = this.storage.bucket(bucket).file(key);
    await file.delete();
  }

  async list(bucket: string, prefix?: string): Promise<string[]> {
    const options = prefix ? { prefix } : {};
    const [files] = await this.storage.bucket(bucket).getFiles(options);
    return files.map((file) => file.name);
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    const file = this.storage.bucket(bucket).file(key);
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3600 * 1000, // 1 hour
    };

    const [url] = await file.getSignedUrl(options);
    return url;
  }
}
