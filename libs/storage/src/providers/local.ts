import { StorageProvider } from '../types';
import { join, dirname } from 'path';

declare const Deno: any;
declare const Bun: any;

type FileSystem = {
  mkdir: (path: string, options?: { recursive: boolean }) => Promise<void>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  readFile: (path: string) => Promise<Uint8Array>;
  unlink: (path: string) => Promise<void>;
  readdir: (
    path: string,
    options?: { recursive: boolean }
  ) => Promise<string[]>;
  createWriteStream?: (path: string) => any;
};

const getFileSystem = (): FileSystem => {
  if (typeof Deno !== 'undefined') {
    return Deno.fs;
  } else if (typeof Bun !== 'undefined') {
    return Bun.fs;
  } else {
    return require('fs').promises;
  }
};

export interface LocalStorageConfig {
  rootDir?: string;
}

export class LocalStorageProvider implements StorageProvider {
  private rootDir: string;

  constructor(config: LocalStorageConfig = {}) {
    this.rootDir = config.rootDir || './storage';
  }

  private async ensureDirectory(path: string): Promise<void> {
    const fs = getFileSystem();
    await fs.mkdir(dirname(path), { recursive: true });
  }

  private getFilePath(bucket: string, key: string): string {
    return join(this.rootDir, bucket, key);
  }

  async upload(
    bucket: string,
    key: string,
    data: Uint8Array | ReadableStream
  ): Promise<void> {
    const filePath = this.getFilePath(bucket, key);
    await this.ensureDirectory(filePath);

    const fs = getFileSystem();
    if (data instanceof Uint8Array) {
      await fs.writeFile(filePath, data);
    } else {
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const concatenated = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      for (const chunk of chunks) {
        concatenated.set(chunk, offset);
        offset += chunk.length;
      }
      await fs.writeFile(filePath, concatenated);
    }
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const fs = getFileSystem();
    const filePath = this.getFilePath(bucket, key);
    const data = await fs.readFile(filePath);
    return Buffer.from(data);
  }

  async delete(bucket: string, key: string): Promise<void> {
    const fs = getFileSystem();
    const filePath = this.getFilePath(bucket, key);
    await fs.unlink(filePath);
  }

  async list(bucket: string, prefix?: string): Promise<string[]> {
    const fs = getFileSystem();
    const bucketPath = join(this.rootDir, bucket);
    try {
      const files = await fs.readdir(bucketPath, { recursive: true });
      return files
        .filter((file) => !prefix || file.startsWith(prefix))
        .map((file) => file.toString());
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
