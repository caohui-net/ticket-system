import { IsNumber, Min, IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitBudgetDto {
  @ApiProperty({
    description: '预算金额',
    example: 50000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: '预算说明',
    example: '办公设备采购预算',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: '预算文件URL数组',
    example: ['https://example.com/budget1.pdf', 'https://example.com/budget2.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
