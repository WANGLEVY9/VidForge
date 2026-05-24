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
    origin: '*',
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
