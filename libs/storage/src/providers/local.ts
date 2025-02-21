import { StorageProvider } from '../types';
import { promises as fs } from 'fs';
import * as fsCallback from 'fs';
import { join, dirname } from 'path';
import { ReadStream } from 'fs';

export interface LocalStorageConfig {
  rootDir?: string;
}

export class LocalStorageProvider implements StorageProvider {
  private rootDir: string;

  constructor(config: LocalStorageConfig = {}) {
    this.rootDir = config.rootDir || './storage';
  }

  private async ensureDirectory(path: string): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true });
  }

  private getFilePath(bucket: string, key: string): string {
    return join(this.rootDir, bucket, key);
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | ReadStream
  ): Promise<void> {
    const filePath = this.getFilePath(bucket, key);
    await this.ensureDirectory(filePath);

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      const writeStream = fsCallback.createWriteStream(filePath);
      data.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const filePath = this.getFilePath(bucket, key);
    return await fs.readFile(filePath);
  }

  async delete(bucket: string, key: string): Promise<void> {
    const filePath = this.getFilePath(bucket, key);
    await fs.unlink(filePath);
  }

  async list(bucket: string, prefix?: string): Promise<string[]> {
    const bucketPath = join(this.rootDir, bucket);
    try {
      const files = await fs.readdir(bucketPath, { withFileTypes: true });
      const fileNames = files
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .filter((file) => !prefix || file.startsWith(prefix));
      return fileNames;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    return `file://${this.getFilePath(bucket, key)}`;
  }
}
