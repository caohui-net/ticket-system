import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectStepDto {
  @ApiProperty({
    description: '驳回原因（必填）',
    example: '预算金额过高，请重新评估',
    maxLength: 500,
  })
  @IsNotEmpty({ message: '驳回原因不能为空' })
  @IsString()
  @MaxLength(500)
  comment: string;
}
