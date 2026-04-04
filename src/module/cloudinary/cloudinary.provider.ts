import { v2 as cloudinary } from 'cloudinary';
import { Provider } from '@nestjs/common';
import { GlobalConfigService } from 'src/shared/config/global.config';

export const CLOUDINARY = 'Cloudinary';

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  useFactory: (configService: GlobalConfigService) => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = configService.cloudinary;

    return cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
  },
  inject: [GlobalConfigService],
};
