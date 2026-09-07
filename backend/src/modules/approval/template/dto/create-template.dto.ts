import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: '模板名称', example: '立项审批模板（条件分支）' })
  @IsString()
  name: string;

  @ApiProperty({ description: '模板描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '审批类型', example: 'PROJECT_APPROVAL' })
  @IsString()
  type: string;

  @ApiProperty({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: '模板配置（JSON）',
    example: {
      steps: [
        {
          stepNumber: 1,
          stepName: '部门主管审核',
          stepType: 'SEQUENTIAL',
          approverRole: 'DEPT_MANAGER',
        },
        {
          stepNumber: 2,
          stepName: '财务审核',
          stepType: 'SEQUENTIAL',
          approverRole: 'FINANCE',
          condition: {
            field: 'amount',
            operator: '>',
            value: 10000,
          },
        },
      ],
    },
  })
  @IsObject()
  config: any;
}
