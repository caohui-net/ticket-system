import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitSettlementDto {
  @ApiProperty({
    description: '结算总金额',
    example: 500000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    description: '原始合同金额',
    example: 450000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiPropertyOptional({
    description: '签证增加金额',
    example: 50000,
    type: Number,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  visaAmount?: number;

  @ApiProperty({
    description: '结算说明',
    example: '项目已完工，提交结算申请',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: '附件URL数组',
    example: ['https://example.com/settlement1.pdf'],
    type: [String],
  })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}
