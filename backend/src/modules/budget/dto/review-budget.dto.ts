import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewBudgetDto {
  @ApiProperty({
    description: '审核结果，true=通过，false=驳回',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: '审核意见（必填）',
    example: '预算合理，同意通过',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
