import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 副主任审核报修DTO
 */
export class ReviewRepairDto {
  @ApiProperty({
    description: '审核结果，true=通过，false=驳回',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: '审核意见（必填）',
    example: '报修合理，同意处理',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
