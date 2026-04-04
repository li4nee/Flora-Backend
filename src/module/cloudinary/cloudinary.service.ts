import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CloudinaryResponse } from './cloudinary-response';

@Injectable()
export class CloudinaryService {
  uploadFile(file: { buffer: Buffer }): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder: 'flora-community' }, (error, result) => {
        if (error) {
          if (error instanceof Error) return reject(new Error(error.message));

          const errorMessage =
            typeof error === 'string'
              ? error
              : (() => {
                  try {
                    return JSON.stringify(error);
                  } catch {
                    return 'Unknown Cloudinary upload error';
                  }
                })();

          return reject(new Error(errorMessage ?? 'Unknown Cloudinary upload error'));
        }
        resolve(result as CloudinaryResponse);
      });

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
