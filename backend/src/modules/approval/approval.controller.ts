import { Controller, Get, Post, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApproveStepDto } from './dto/approve-step.dto';
import { RejectStepDto } from './dto/reject-step.dto';

@ApiTags('approval')
@ApiBearerAuth('JWT-auth')
@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('ticket/:ticketId')
  @ApiOperation({
    summary: '查询工单审批流程',
    description: '查询指定工单的审批流程及所有步骤信息'
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
          type: 'PROJECT_APPROVAL',
          status: 'IN_PROGRESS',
          currentStep: 1,
          totalSteps: 3,
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              status: 'PENDING',
              approverRole: 'DEPUTY_DIRECTOR',
              approvers: [{ id: 10, name: '张三' }]
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              status: 'WAITING',
              approverRole: 'DIRECTOR'
            }
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '审批流程不存在' })
  async getFlowByTicketId(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const flow = await this.approvalService.getFlowByTicketId(BigInt(ticketId));
    return { success: true, data: flow };
  }

  @Get('pending')
  @ApiOperation({
    summary: '查询我的待审批列表',
    description: '查询当前用户需要审批的所有待办事项'
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        success: true,
        data: [
          {
            flowId: 1,
            ticketId: 123,
            ticketTitle: '办公楼空调维修',
            type: 'REPAIR_APPROVAL',
            stepNumber: 1,
            stepName: '副主任审核',
            createdAt: '2024-01-01T00:00:00.000Z'
          },
          {
            flowId: 2,
            ticketId: 124,
            ticketTitle: '设备采购立项',
            type: 'PROJECT_APPROVAL',
            stepNumber: 2,
            stepName: '主任审批',
            createdAt: '2024-01-02T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  async getMyPendingApprovals(@CurrentUser() user: any) {
    const approvals = await this.approvalService.getPendingApprovals(user.userId);
    return { success: true, data: approvals };
  }

  @Post(':flowId/steps/:stepNumber/approve')
  @ApiOperation({
    summary: '审批通过',
    description: '审批人对审批步骤进行通过操作，推进到下一步或完成流程'
  })
  @ApiParam({ name: 'flowId', description: '审批流程ID', type: Number })
  @ApiParam({ name: 'stepNumber', description: '步骤编号', type: Number })
  @ApiResponse({
    status: 200,
    description: '审批成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          type: 'PROJECT_APPROVAL',
          status: 'IN_PROGRESS',
          currentStep: 2,
          totalSteps: 3,
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              status: 'APPROVED',
              approvedBy: 10,
              approvedAt: '2024-01-01T12:00:00.000Z',
              comment: '同意'
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              status: 'PENDING'
            }
          ]
        },
        message: '审批通过'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误或步骤状态不允许审批' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限审批此步骤' })
  @ApiResponse({ status: 404, description: '审批流程或步骤不存在' })
  async approve(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
    @Body() dto: ApproveStepDto,
    @CurrentUser() user: any,
  ) {
    const flow = await this.approvalService.approve(
      BigInt(flowId),
      stepNumber,
      user.userId,
      dto.comment,
    );
    return { success: true, data: flow, message: '审批通过' };
  }

  @Post(':flowId/steps/:stepNumber/reject')
  @ApiOperation({
    summary: '审批驳回',
    description: '审批人对审批步骤进行驳回操作，终止审批流程'
  })
  @ApiParam({ name: 'flowId', description: '审批流程ID', type: Number })
  @ApiParam({ name: 'stepNumber', description: '步骤编号', type: Number })
  @ApiResponse({
    status: 200,
    description: '驳回成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          type: 'PROJECT_APPROVAL',
          status: 'REJECTED',
          currentStep: 1,
          totalSteps: 3,
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              status: 'REJECTED',
              rejectedBy: 10,
              rejectedAt: '2024-01-01T12:00:00.000Z',
              comment: '预算不合理，需重新评估'
            }
          ]
        },
        message: '已驳回'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误或步骤状态不允许驳回' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限驳回此步骤' })
  @ApiResponse({ status: 404, description: '审批流程或步骤不存在' })
  async reject(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
    @Body() dto: RejectStepDto,
    @CurrentUser() user: any,
  ) {
    const flow = await this.approvalService.reject(
      BigInt(flowId),
      stepNumber,
      user.userId,
      dto.comment,
    );
    return { success: true, data: flow, message: '已驳回' };
  }

  @Post(':flowId/steps/:stepNumber/approve/parallel')
  @ApiOperation({
    summary: '并行审批通过',
    description: '并行审批节点中的审批人进行通过操作，满足条件后推进流程'
  })
  @ApiParam({ name: 'flowId', description: '审批流程ID', type: Number })
  @ApiParam({ name: 'stepNumber', description: '步骤编号', type: Number })
  @ApiResponse({
    status: 200,
    description: '审批已提交',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          type: 'PROJECT_APPROVAL',
          status: 'IN_PROGRESS',
          currentStep: 1,
          steps: [
            {
              stepNumber: 1,
              stepName: '联合审批',
              status: 'IN_PROGRESS',
              stepType: 'PARALLEL',
              approvalMode: 'ALL',
              approvalRecords: [
                { approverId: 10, status: 'APPROVED', comment: '同意', approvedAt: '2024-01-01T12:00:00.000Z' },
                { approverId: 11, status: 'PENDING' }
              ]
            }
          ]
        },
        message: '审批已提交'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限审批' })
  @ApiResponse({ status: 404, description: '审批流程不存在' })
  async approveParallel(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
    @Body() dto: ApproveStepDto,
    @CurrentUser() user: any,
  ) {
    const flow = await this.approvalService.approveParallel(
      BigInt(flowId),
      stepNumber,
      user.userId,
      dto.comment,
    );
    return { success: true, data: flow, message: '审批已提交' };
  }

  @Post(':flowId/steps/:stepNumber/reject/parallel')
  @ApiOperation({
    summary: '并行审批驳回',
    description: '并行审批节点中的审批人进行驳回操作'
  })
  @ApiParam({ name: 'flowId', description: '审批流程ID', type: Number })
  @ApiParam({ name: 'stepNumber', description: '步骤编号', type: Number })
  @ApiResponse({
    status: 200,
    description: '已驳回',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          type: 'PROJECT_APPROVAL',
          status: 'REJECTED',
          currentStep: 1,
          steps: [
            {
              stepNumber: 1,
              stepName: '联合审批',
              status: 'REJECTED',
              stepType: 'PARALLEL',
              approvalRecords: [
                { approverId: 10, status: 'REJECTED', comment: '不同意', rejectedAt: '2024-01-01T12:00:00.000Z' }
              ]
            }
          ]
        },
        message: '已驳回'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 403, description: '无权限驳回' })
  @ApiResponse({ status: 404, description: '审批流程不存在' })
  async rejectParallel(
    @Param('flowId', ParseIntPipe) flowId: number,
    @Param('stepNumber', ParseIntPipe) stepNumber: number,
    @Body() dto: RejectStepDto,
    @CurrentUser() user: any,
  ) {
    const flow = await this.approvalService.rejectParallel(
      BigInt(flowId),
      stepNumber,
      user.userId,
      dto.comment,
    );
    return { success: true, data: flow, message: '已驳回' };
  }

  @Post('template/:templateId/ticket/:ticketId')
  @ApiOperation({
    summary: '使用模板创建审批流程',
    description: '根据审批模板为工单创建审批流程，支持条件分支等高级特性'
  })
  @ApiParam({ name: 'templateId', description: '审批模板ID', type: Number })
  @ApiParam({ name: 'ticketId', description: '工单ID', type: Number })
  @ApiResponse({
    status: 201,
    description: '审批流程创建成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          ticketId: 123,
          templateId: 5,
          type: 'PROJECT_APPROVAL',
          status: 'PENDING',
          currentStep: 1,
          totalSteps: 3,
          steps: [
            {
              stepNumber: 1,
              stepName: '副主任审核',
              status: 'PENDING',
              approverRole: 'DEPUTY_DIRECTOR'
            },
            {
              stepNumber: 2,
              stepName: '主任审批',
              status: 'WAITING',
              approverRole: 'DIRECTOR'
            },
            {
              stepNumber: 3,
              stepName: '财务审核',
              status: 'WAITING',
              approverRole: 'FINANCE'
            }
          ],
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        message: '审批流程已创建'
      }
    }
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权，需要登录' })
  @ApiResponse({ status: 404, description: '模板或工单不存在' })
  @ApiResponse({ status: 409, description: '该工单已存在审批流程' })
  async createFromTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ) {
    const flow = await this.approvalService.createConditionalFlow(
      BigInt(ticketId),
      BigInt(templateId),
    );
    return { success: true, data: flow, message: '审批流程已创建' };
  }
}
