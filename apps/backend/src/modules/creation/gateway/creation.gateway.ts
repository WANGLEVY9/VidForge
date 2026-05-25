import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    // 与 main.ts 中 HTTP CORS 对齐：放开所有 *.vercel.app 子域 + 配置的 WEB_BASE_URL + 同源
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed = (process.env.WEB_BASE_URL ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (allowed.includes(origin)) return callback(null, true);
      if (/^https?:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)) return callback(null, true);
      return callback(new Error(`WS CORS blocked: ${origin}`), false);
    },
    credentials: true,
  },
  namespace: '/creation',
})
export class CreationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CreationGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客户端断开: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, taskId: string) {
    client.join(`task:${taskId}`);
    this.logger.log(`客户端 ${client.id} 订阅任务: ${taskId}`);
  }

  emitShotProgress(taskId: string, data: { shotId: string; progress: number; status: string; message?: string }) {
    this.server.to(`task:${taskId}`).emit('shot-progress', data);
  }

  emitProgress(taskId: string, data: { progress: number; status: string; message?: string }) {
    this.server.to(`task:${taskId}`).emit('progress', data);
  }

  emitComplete(taskId: string, data: any) {
    this.server.to(`task:${taskId}`).emit('complete', data);
  }

  emitError(taskId: string, error: string) {
    this.server.to(`task:${taskId}`).emit('error', { message: error });
  }
}
