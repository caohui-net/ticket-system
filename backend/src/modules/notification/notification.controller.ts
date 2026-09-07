import {
  Controller,
  Get,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationSettingEntity } from './entities/notification-setting.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('通知管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiResponse({ status: 200, description: '返回通知列表', type: [NotificationEntity] })
  async findAll(@CurrentUser() user: any, @Query() query: QueryNotificationsDto) {
    return this.notificationService.findAll(user.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({ status: 200, description: '返回未读数量' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记单个通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(user.userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiParam({ name: 'id', description: '通知ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationService.remove(user.userId, id);
  }
}

@ApiTags('通知设置')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-settings')
export class NotificationSettingController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取用户通知设置' })
  @ApiResponse({
    status: 200,
    description: '返回通知设置',
    type: NotificationSettingEntity,
  })
  async getSettings(@CurrentUser() user: any) {
    return this.notificationService.getNotificationSetting(user.userId);
  }

  @Put()
  @ApiOperation({ summary: '更新用户通知设置' })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    type: NotificationSettingEntity,
  })
  async updateSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationSettingDto,
  ) {
    return this.notificationService.updateNotificationSetting(user.userId, dto);
  }
}
