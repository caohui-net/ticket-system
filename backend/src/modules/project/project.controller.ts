import { Controller, Post, Get, Patch, Param, Body, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InitiateProjectDto } from './dto/initiate-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('project')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('ticket/:ticketId')
  @ApiOperation({
    summary: '发起立项',
    description: '为工单发起立项审批流程，提交项目基本信息'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '立项发起成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          projectName: '办公楼空调系统改造项目',
          description: '更换老化空调设备，优化能耗',
          estimatedBudget: 500000,
          estimatedDuration: 30,
          status: 'PENDING',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        message: '立项审批已发起'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '工单不存在' })
  @ApiResponse({ status: 409, description: '该工单已存在立项' })
  async initiateProject(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: InitiateProjectDto,
    @CurrentUser() user: any,
  ) {
    const project = await this.projectService.initiateProject(ticketId, dto, user.userId);
    return { success: true, data: project, message: '立项审批已发起' };
  }

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: '查询工单立项',
    description: '查询指定工单的立项信息'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          projectName: '办公楼空调系统改造项目',
          description: '更换老化空调设备，优化能耗',
          estimatedBudget: 500000,
          estimatedDuration: 30,
          status: 'APPROVED',
          approvedBy: 20,
          approvedAt: '2024-01-02T00:00:00.000Z',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '立项不存在' })
  async getProject(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const project = await this.projectService.getProject(ticketId);
    if (!project) {
      throw new NotFoundException('立项不存在');
    }
    return { success: true, data: project };
  }

  @Patch('ticket/:ticketId')
  @ApiOperation({
    summary: '更新立项信息',
    description: '更新立项的基本信息，仅在审批前可修改'
  })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          projectName: '办公楼空调系统改造项目（修订）',
          description: '更换老化空调设备，优化能耗，增加智能控制系统',
          estimatedBudget: 550000,
          estimatedDuration: 35,
          status: 'PENDING',
          createdBy: 10,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z'
        },
        message: '立项已更新'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误或立项已锁定' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限修改' })
  @ApiResponse({ status: 404, description: '立项不存在' })
  async updateProject(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    const project = await this.projectService.updateProject(ticketId, dto, user.userId);
    return { success: true, data: project, message: '立项已更新' };
  }
}
