import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { isValidFileType, isValidFileSize } from '@vidforge/common';

export const multerConfig: MulterOptions = {
  storage: require('multer').memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-flv'];
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'];

    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes];
    
    if (!isValidFileType(file, allowedTypes)) {
      return cb(new BadRequestException('不支持的文件类型，仅支持图片、视频、音频格式'), false);
    }

    // 图片最大10MB，视频最大500MB，音频最大50MB
    const maxSizeMap = {
      image: 10 * 1024 * 1024,
      video: 500 * 1024 * 1024,
      audio: 50 * 1024 * 1024,
    };

    const fileType = file.mimetype.split('/')[0];
    const maxSize = maxSizeMap[fileType] || 10 * 1024 * 1024;

    if (!isValidFileSize(file, maxSize)) {
      return cb(new BadRequestException(`文件大小超出限制，${fileType}类型最大支持${maxSize / 1024 / 1024}MB`), false);
    }

    cb(null, true);
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 最大500MB
  },
};
