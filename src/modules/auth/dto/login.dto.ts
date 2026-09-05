import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsString()
  @Length(6, 100)
  password: string;
}
