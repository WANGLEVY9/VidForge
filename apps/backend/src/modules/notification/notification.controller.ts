import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { ListNotificationQueryDto } from './dto/notification.dto';

interface AuthedReq extends Request {
  user: { sub: string; email: string; role: string };
}

@ApiTags('通知中心')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '列出当前用户可见的通知(自己的 + 全员广播)' })
  async list(@Req() req: AuthedReq, @Query() query: ListNotificationQueryDto) {
    return this.service.list(req.user.sub, {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      unreadOnly: query.unread === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: '当前用户的未读通知数(不含广播)' })
  async unreadCount(@Req() req: AuthedReq) {
    const count = await this.service.unreadCount(req.user.sub);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记某条通知为已读' })
  async markRead(@Req() req: AuthedReq, @Param('id') id: string) {
    return this.service.markRead(req.user.sub, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '标记全部为已读' })
  async markAllRead(@Req() req: AuthedReq) {
    return this.service.markAllRead(req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除某条通知(广播不可删)' })
  async remove(@Req() req: AuthedReq, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }

  /**
   * 调试用:由当前用户给自己发一条测试通知
   */
  @Post('debug/self')
  @ApiOperation({ summary: '调试:给自己发一条测试通知' })
  async debugSelf(@Req() req: AuthedReq, @Body() body: { title?: string; content?: string }) {
    return this.service.create({
      userId: req.user.sub,
      type: 'tip',
      title: body?.title || '测试通知',
      content: body?.content || '这是一条由 /notifications/debug/self 创建的测试通知',
    });
  }
}
