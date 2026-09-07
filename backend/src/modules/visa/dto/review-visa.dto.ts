import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewVisaDto {
  @ApiProperty({
    description: '审核结果，true=通过，false=驳回',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    description: '审核意见（必填）',
    example: '签证理由充分，同意通过',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
