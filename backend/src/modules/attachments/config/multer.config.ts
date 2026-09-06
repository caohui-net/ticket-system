import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
  // 图片
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
  // Office文档
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 文本
  'text/plain',
  // 压缩文件
  'application/zip',
  'application/x-rar-compressed',
];

// 文件大小限制（10MB）
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 生成上传目录路径（按年/月/日分类）
function getUploadPath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const uploadPath = join(process.cwd(), 'uploads', 'attachments', String(year), month, day);

  // 确保目录存在
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  return uploadPath;
}

// Multer配置
export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = getUploadPath();
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // 生成唯一文件名：时间戳-随机字符串-原文件名
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = extname(originalName);
      const nameWithoutExt = originalName.replace(ext, '');
      const uniqueName = `${timestamp}-${randomString}-${nameWithoutExt}${ext}`;

      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          `不支持的文件类型: ${file.mimetype}. 支持的类型: 图片、PDF、Office文档、文本、压缩文件`,
        ),
        false,
      );
    }

    cb(null, true);
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};
