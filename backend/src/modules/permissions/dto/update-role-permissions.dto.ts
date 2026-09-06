import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: '权限ID列表',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  permissionIds: number[];
}

export class AddRolePermissionDto {
  @ApiProperty({ description: '权限ID', example: 1 })
  @IsNotEmpty()
  permissionId: number;
}
