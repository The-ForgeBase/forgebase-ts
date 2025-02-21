import { StorageProvider } from '../types';
import { v2 as cloudinary } from 'cloudinary';
import { ReadStream } from 'fs';
import { Readable } from 'stream';

export interface CloudinaryStorageConfig {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  folder?: string;
}

export class CloudinaryStorageProvider implements StorageProvider {
  private folder: string;

  constructor(config: CloudinaryStorageConfig) {
    cloudinary.config({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      api_secret: config.api_secret,
    });
    this.folder = config.folder || '';
  }

  private getFullPath(bucket: string, key: string): string {
    const path = this.folder
      ? `${this.folder}/${bucket}/${key}`
      : `${bucket}/${key}`;
    return path.replace(/\/+/g, '/');
  }

  async upload(
    bucket: string,
    key: string,
    data: Buffer | ReadStream
  ): Promise<void> {
    const path = this.getFullPath(bucket, key);

    if (Buffer.isBuffer(data)) {
      await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ public_id: path }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(data);
      });
    } else {
      await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { public_id: path },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        data.pipe(uploadStream);
      });
    }
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const path = this.getFullPath(bucket, key);
    const url = cloudinary.url(path);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async delete(bucket: string, key: string): Promise<void> {
    const path = this.getFullPath(bucket, key);
    await cloudinary.uploader.destroy(path);
  }

  async list(bucket: string, prefix?: string): Promise<string[]> {
    const path = prefix
      ? this.getFullPath(bucket, prefix)
      : this.getFullPath(bucket, '');
    const result = await cloudinary.search
      .expression(`folder:${path}*`)
      .execute();

    return result.resources.map((resource: any) => {
      const fullPath = resource.public_id;
      return fullPath.startsWith(path) ? fullPath.slice(path.length) : fullPath;
    });
  }

  async getUrl(bucket: string, key: string): Promise<string> {
    const path = this.getFullPath(bucket, key);
    return cloudinary.url(path);
  }
}
