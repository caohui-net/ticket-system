import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketType, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ description: '工单标题', example: '电脑无法开机' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  @MaxLength(200, { message: '标题最多200个字符' })
  title: string;

  @ApiProperty({ description: '工单描述', example: '办公室电脑按电源键没有反应' })
  @IsNotEmpty({ message: '描述不能为空' })
  @IsString()
  description: string;

  @ApiProperty({
    description: '工单类型',
    enum: TicketType,
    example: TicketType.ISSUE,
  })
  @IsEnum(TicketType, { message: '工单类型无效' })
  type: TicketType;

  @ApiProperty({
    description: '优先级',
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: '优先级无效' })
  priority?: TicketPriority;

  @ApiProperty({
    description: '标签',
    example: ['硬件', '紧急'],
    required: false,
    type: [String],
  })
  @IsOptional()
  tags?: string[];
}
