import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET missing). File uploads will be disabled.',
      );
      return;
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    this.configured = true;
    this.logger.log('Cloudinary configured');
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Returns the secure URL of the uploaded asset.
   *
   * @param buffer   Raw file bytes (from multer memory storage)
   * @param folder   Cloudinary folder path, e.g. "medic-docs"
   * @param publicId Optional stable public_id (omit to auto-generate)
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          // Auto-quality + format (WebP on browsers that support it)
          quality: 'auto',
          fetch_format: 'auto',
          // Strip EXIF for privacy
          exif: false,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /** Delete an asset by its Cloudinary public_id */
  async deleteByUrl(secureUrl: string): Promise<void> {
    if (!this.configured) return;
    // Extract public_id from URL: everything after /upload/.../ without extension
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    if (!match) return;
    const publicId = match[1];
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${String(err)}`);
    }
  }
}
