import type { CreateTaskDto } from '../creation/dto/create-task.dto';

/**
 * Payloads crossing a process boundary must stay JSON serializable. Keep the
 * DTO snapshot in the job so a worker can finish a task without reaching back
 * into the API process.
 */
export interface CreationShotJob {
  taskId: string;
  dto: CreateTaskDto;
}

export interface CreationComposeJob {
  taskId: string;
  dto: CreateTaskDto;
}

export interface ExportEncodeJob {
  taskId: string;
  sourceUrl?: string;
}
