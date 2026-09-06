import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettingEntity {
  @ApiProperty({ description: '设置ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '应用内通知总开关' })
  inAppEnabled: boolean;

  @ApiProperty({ description: '工单创建通知' })
  ticketCreated: boolean;

  @ApiProperty({ description: '工单分配通知' })
  ticketAssigned: boolean;

  @ApiProperty({ description: '状态变更通知' })
  ticketStatusChanged: boolean;

  @ApiProperty({ description: '评论通知' })
  ticketCommented: boolean;

  @ApiProperty({ description: '@提及通知' })
  mention: boolean;

  @ApiProperty({ description: '邮件通知总开关' })
  emailEnabled: boolean;

  @ApiProperty({ description: '工单创建邮件通知' })
  emailTicketCreated: boolean;

  @ApiProperty({ description: '工单分配邮件通知' })
  emailTicketAssigned: boolean;

  @ApiProperty({ description: '状态变更邮件通知' })
  emailTicketStatusChanged: boolean;

  @ApiProperty({ description: '评论邮件通知' })
  emailTicketCommented: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
