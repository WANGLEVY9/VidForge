// 通用分页查询参数
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// 通用分页结果
export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 通用响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 视频分辨率枚举
export enum VideoResolution {
  RESOLUTION_720P = '720p',
  RESOLUTION_1080P = '1080p',
  RESOLUTION_2K = '2k',
  RESOLUTION_4K = '4k',
}

// 视频比例枚举
export enum VideoAspectRatio {
  RATIO_9_16 = '9:16', // 竖版
  RATIO_16_9 = '16:9', // 横版
  RATIO_1_1 = '1:1', // 正方形
}

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
