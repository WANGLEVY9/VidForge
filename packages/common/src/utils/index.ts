import * as crypto from 'crypto';

/**
 * 生成随机UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 生成文件名
 */
export function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop();
  const uuid = generateUUID();
  return `${uuid}.${ext}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 截取字符串，超出部分显示省略号
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * 验证文件类型
 */
export function isValidFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.mimetype);
}

/**
 * 验证文件大小
 */
export function isValidFileSize(file: Express.Multer.File, maxSize: number): boolean {
  return file.size <= maxSize;
}
