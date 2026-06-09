import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Creation WebSocket Gateway
 *
 * 断线重连策略:
 * - 客户端 socket.io 配置 reconnection:true, reconnectionAttempts:10,
 *   reconnectionDelay:1000, reconnectionDelayMax:5000
 * - 服务端无状态:断线期间丢失的 progress 事件可通过 HTTP GET /creation/:id
 *   补拉最新状态;重连后客户端应在 subscribe 回调中重新 join room
 *
 * 消息频率控制:
 * - progress 事件在轮询循环中每 4s 发一次,已通过 POLL_INTERVAL_MS 限频
 * - shot-progress 与 progress 同步发出,不做额外 throttle;
 *   若未来分镜数 >20 导致消息风暴,可在 emitShotProgress 内加 throttle(1s)
 */
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
