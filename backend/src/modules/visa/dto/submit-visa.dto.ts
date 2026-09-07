import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitVisaDto {
  @ApiProperty({
    description: '签证标题',
    example: '工程量增加签证',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '签证原因',
    example: '因设计变更导致工程量增加',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: '变更类型',
    enum: ['COST_INCREASE', 'DURATION_EXTEND', 'SCOPE_CHANGE'],
    example: 'COST_INCREASE',
  })
  @IsEnum(['COST_INCREASE', 'DURATION_EXTEND', 'SCOPE_CHANGE'])
  changeType: string;

  @ApiPropertyOptional({
    description: '原始值',
    example: 100000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalValue?: number;

  @ApiProperty({
    description: '变更后的值',
    example: 120000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  changedValue: number;

  @ApiProperty({
    description: '签证描述',
    example: '增加地下室防水施工',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: '附件URL数组',
    example: ['https://example.com/visa1.pdf'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}
