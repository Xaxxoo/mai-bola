import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageService {
  save(file: Express.Multer.File): Promise<string>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async save(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname) || '';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const dest = path.join(this.uploadDir, filename);
    fs.writeFileSync(dest, file.buffer);
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    return `${baseUrl}/uploads/${filename}`;
  }
}
