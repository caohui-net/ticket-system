import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationSettingDto {
  @ApiPropertyOptional({ description: '应用内通知总开关' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ description: '工单创建通知' })
  @IsOptional()
  @IsBoolean()
  ticketCreated?: boolean;

  @ApiPropertyOptional({ description: '工单分配通知' })
  @IsOptional()
  @IsBoolean()
  ticketAssigned?: boolean;

  @ApiPropertyOptional({ description: '状态变更通知' })
  @IsOptional()
  @IsBoolean()
  ticketStatusChanged?: boolean;

  @ApiPropertyOptional({ description: '评论通知' })
  @IsOptional()
  @IsBoolean()
  ticketCommented?: boolean;

  @ApiPropertyOptional({ description: '@提及通知' })
  @IsOptional()
  @IsBoolean()
  mention?: boolean;

  @ApiPropertyOptional({ description: '邮件通知总开关' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: '工单创建邮件通知' })
  @IsOptional()
  @IsBoolean()
  emailTicketCreated?: boolean;

  @ApiPropertyOptional({ description: '工单分配邮件通知' })
  @IsOptional()
  @IsBoolean()
  emailTicketAssigned?: boolean;

  @ApiPropertyOptional({ description: '状态变更邮件通知' })
  @IsOptional()
  @IsBoolean()
  emailTicketStatusChanged?: boolean;

  @ApiPropertyOptional({ description: '评论邮件通知' })
  @IsOptional()
  @IsBoolean()
  emailTicketCommented?: boolean;
}
