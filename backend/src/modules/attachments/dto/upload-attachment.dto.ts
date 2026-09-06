import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAttachmentDto {
  @ApiProperty({
    description: '附件文件',
    type: 'string',
    format: 'binary',
  })
  file: any;
}
