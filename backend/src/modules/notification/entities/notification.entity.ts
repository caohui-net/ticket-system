import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationEntity {
  @ApiProperty({ description: '通知ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ enum: NotificationType, description: '通知类型' })
  type: NotificationType;

  @ApiProperty({ description: '通知标题' })
  title: string;

  @ApiProperty({ description: '通知内容' })
  content: string;

  @ApiProperty({ description: '链接', required: false })
  link?: string;

  @ApiProperty({ description: '是否已读' })
  read: boolean;

  @ApiProperty({ description: '已读时间', required: false })
  readAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
