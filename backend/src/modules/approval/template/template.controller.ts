import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('审批模板管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approval/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({
    summary: '创建审批模板',
    description: '创建新的审批流程模板，包括串行、并行、条件分支等类型'
  })
  @ApiResponse({
    status: 201,
    description: '模板创建成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: '报修审批流程',
          type: 'REPAIR_APPROVAL',
          description: '报修工单标准审批流程',
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              approverRole: 'DEPUTY_DIRECTOR',
              stepType: 'SERIAL'
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              approverRole: 'DIRECTOR',
              stepType: 'SERIAL'
            }
          ],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        message: '模板创建成功'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限创建模板' })
  @ApiResponse({ status: 409, description: '模板已存在' })
  async create(@Body() dto: CreateTemplateDto) {
    const template = await this.templateService.create(dto);
    return {
      success: true,
      data: template,
      message: '模板创建成功',
    };
  }

  @Get()
  @ApiOperation({
    summary: '查询审批模板列表',
    description: '查询审批模板列表，支持按类型和状态筛选'
  })
  @ApiQuery({ name: 'type', required: false, description: '模板类型：REPAIR_APPROVAL, PROJECT_APPROVAL, BUDGET_APPROVAL等', type: String })
  @ApiQuery({ name: 'isActive', required: false, description: '是否启用', type: Boolean })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: '报修审批流程',
            type: 'REPAIR_APPROVAL',
            description: '报修工单标准审批流程',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 2,
            name: '立项审批流程',
            type: 'PROJECT_APPROVAL',
            description: '项目立项标准审批流程',
            isActive: true,
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  async findAll(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.templateService.findAll(
      type,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
    return {
      success: true,
      data: templates,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: '查询审批模板详情',
    description: '查询指定审批模板的详细信息，包括所有审批步骤'
  })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: '报修审批流程',
          type: 'REPAIR_APPROVAL',
          description: '报修工单标准审批流程',
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              approverRole: 'DEPUTY_DIRECTOR',
              stepType: 'SERIAL',
              approvalMode: 'ANY_ONE'
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              approverRole: 'DIRECTOR',
              stepType: 'SERIAL',
              approvalMode: 'ANY_ONE'
            }
          ],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const template = await this.templateService.findOne(BigInt(id));
    return {
      success: true,
      data: template,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新审批模板',
    description: '更新审批模板的基本信息和审批步骤'
  })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: '报修审批流程（修订版）',
          type: 'REPAIR_APPROVAL',
          description: '报修工单标准审批流程，增加财务审核',
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              approverRole: 'DEPUTY_DIRECTOR',
              stepType: 'SERIAL'
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              approverRole: 'DIRECTOR',
              stepType: 'SERIAL'
            },
            {
              stepNumber: 3,
              stepName: '财务审核',
              approverRole: 'FINANCE',
              stepType: 'SERIAL'
            }
          ],
          isActive: true,
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        message: '模板更新成功'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限更新模板' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    const template = await this.templateService.update(BigInt(id), dto);
    return {
      success: true,
      data: template,
      message: '模板更新成功',
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除审批模板',
    description: '删除审批模板（软删除）'
  })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        success: true,
        message: '模板删除成功'
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限删除模板' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  @ApiResponse({ status: 409, description: '模板正在使用中，无法删除' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.templateService.remove(BigInt(id));
    return result;
  }

  @Post(':id/toggle')
  @ApiOperation({
    summary: '启用/停用审批模板',
    description: '切换审批模板的启用状态'
  })
  @ApiParam({ name: 'id', description: '模板ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: '报修审批流程',
          type: 'REPAIR_APPROVAL',
          isActive: false,
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        message: '模板已停用'
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  @ApiResponse({ status: 404, description: '模板不存在' })
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    const template = await this.templateService.toggleActive(BigInt(id));
    return {
      success: true,
      data: template,
      message: template.isActive ? '模板已启用' : '模板已停用',
    };
  }
}
