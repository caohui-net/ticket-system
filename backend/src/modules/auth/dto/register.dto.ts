import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsEmail, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsString()
  @Length(3, 50)
  @Transform(({ value }) => value.trim())
  username: string;

  @ApiProperty({ description: '密码', example: 'Password123!' })
  @IsString()
  @Length(6, 100)
  password: string;

  @ApiProperty({ description: '真实姓名', example: '张三' })
  @IsString()
  @Length(1, 50)
  realName: string;

  @ApiProperty({ description: '邮箱', example: 'zhangsan@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsOptional()
  @IsString()
  @Length(11, 20)
  phone?: string;

  @ApiProperty({ description: '部门', example: '技术部', required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  department?: string;
}
